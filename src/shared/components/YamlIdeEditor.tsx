'use client';

import React, { useState, useRef, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Button,
  useTheme,
} from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ErrorIcon from '@mui/icons-material/Error';

interface YamlIdeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  isModified?: boolean;
  onReset?: () => void;
  readOnly?: boolean;
  title?: string;
  height?: string | number;
  embedded?: boolean;
  hideHeader?: boolean;
  error?: string | null;
}

/**
 * Escapes HTML entities to prevent injection in syntax highlighting pre tag
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * VS Code Theme YAML Syntax Tokenizer & Highlighter
 */
function highlightYamlLine(line: string, isDark: boolean = true): string {
  const escaped = escapeHtml(line);
  if (!escaped) return '';

  const commentColor = isDark ? '#6a9955' : '#64748b';
  const boolColor = isDark ? '#569cd6' : '#2563eb';
  const numColor = isDark ? '#b5cea8' : '#059669';
  const strColor = isDark ? '#ce9178' : '#b91c1c';
  const hyphenColor = isDark ? '#c586c0' : '#7c3aed';
  const keyColor = isDark ? '#9cdcfe' : '#0369a1';
  const colonColor = isDark ? '#d4d4d4' : '#475569';

  // 1. Full comment line or trailing comment
  const commentIdx = escaped.indexOf('#');
  if (commentIdx === 0) {
    return `<span style="color: ${commentColor}; font-style: italic;">${escaped}</span>`;
  }

  let mainPart = escaped;
  let commentPart = '';
  if (commentIdx > 0) {
    mainPart = escaped.slice(0, commentIdx);
    commentPart = `<span style="color: ${commentColor}; font-style: italic;">${escaped.slice(commentIdx)}</span>`;
  }

  // 2. Key-value pattern:  key: value  or  - key: value
  const keyValRegex = /^(\s*)(-\s+)?([a-zA-Z0-9_.-]+)(\s*:\s*)(.*)$/;
  const match = mainPart.match(keyValRegex);

  if (match) {
    const [, indent, listHyphen, key, colon, value] = match;
    let highlightedVal = value;

    if (value) {
      const trimmedVal = value.trim();
      if (trimmedVal === 'true' || trimmedVal === 'false' || trimmedVal === 'null') {
        highlightedVal = value.replace(
          trimmedVal,
          `<span style="color: ${boolColor}; font-weight: 600;">${trimmedVal}</span>`
        );
      } else if (!isNaN(Number(trimmedVal)) && trimmedVal !== '') {
        highlightedVal = value.replace(
          trimmedVal,
          `<span style="color: ${numColor}; font-weight: 600;">${trimmedVal}</span>`
        );
      } else if (trimmedVal.startsWith('"') || trimmedVal.startsWith("'")) {
        highlightedVal = value.replace(
          trimmedVal,
          `<span style="color: ${strColor};">${trimmedVal}</span>`
        );
      } else {
        // Default scalar strings or units
        highlightedVal = `<span style="color: ${strColor};">${value}</span>`;
      }
    }

    const prefix = `${indent}${
      listHyphen ? `<span style="color: ${hyphenColor}; font-weight: bold;">- </span>` : ''
    }`;
    const keySpan = `<span style="color: ${keyColor}; font-weight: 600;">${key}</span>`;
    const colonSpan = `<span style="color: ${colonColor};">${colon}</span>`;

    return `${prefix}${keySpan}${colonSpan}${highlightedVal}${commentPart}`;
  }

  // 3. Standalone list item: - value
  const listItemRegex = /^(\s*-\s+)(.*)$/;
  const listMatch = mainPart.match(listItemRegex);
  if (listMatch) {
    const [, hyphen, itemVal] = listMatch;
    let highlightedVal = itemVal;
    const trimmedVal = itemVal.trim();
    if (trimmedVal === 'true' || trimmedVal === 'false') {
      highlightedVal = itemVal.replace(
        trimmedVal,
        `<span style="color: ${boolColor}; font-weight: 600;">${trimmedVal}</span>`
      );
    } else if (!isNaN(Number(trimmedVal))) {
      highlightedVal = itemVal.replace(
        trimmedVal,
        `<span style="color: ${numColor}; font-weight: 600;">${trimmedVal}</span>`
      );
    } else {
      highlightedVal = `<span style="color: ${strColor};">${itemVal}</span>`;
    }
    return `<span style="color: ${hyphenColor}; font-weight: bold;">${hyphen}</span>${highlightedVal}${commentPart}`;
  }

  return `${mainPart}${commentPart}`;
}

export default function YamlIdeEditor({
  value,
  onChange,
  isModified = false,
  onReset,
  readOnly = false,
  title = 'manifest.yaml',
  height = '100%',
  embedded = false,
  hideHeader = false,
  error = null,
}: YamlIdeEditorProps) {
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === 'dark';

  const [copied, setCopied] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => value.split('\n'), [value]);
  const lineCount = lines.length;

  const highlightedCode = useMemo(() => {
    return lines.map((line) => highlightYamlLine(line, isDark)).join('\n');
  }, [lines, isDark]);

  const updateCursorPosition = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const selStart = textarea.selectionStart;
    const textBefore = textarea.value.substring(0, selStart);
    const lineNum = textBefore.split('\n').length;
    const lastLineStart = textBefore.lastIndexOf('\n');
    const colNum = selStart - lastLineStart;
    setCursorPos({ line: lineNum, col: colNum });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy YAML', err);
    }
  };

  const handleFormatYaml = () => {
    if (readOnly || !onChange) return;
    try {
      const formatted = lines
        .map((line) => line.trimEnd())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n');
      onChange(formatted);
    } catch {
      // Ignore formatting error
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // 1. Tab & Shift+Tab Indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      if (readOnly || !onChange) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      const indentStr = '  '; // 2 spaces standard for YAML

      if (!e.shiftKey) {
        if (start === end) {
          const newValue = val.substring(0, start) + indentStr + val.substring(end);
          onChange(newValue);
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = start + indentStr.length;
            updateCursorPosition();
          });
        } else {
          const lineStart = val.lastIndexOf('\n', start - 1) + 1;
          const lineEnd = val.indexOf('\n', end);
          const effectiveEnd = lineEnd === -1 ? val.length : lineEnd;
          const selectedBlock = val.substring(lineStart, effectiveEnd);

          const blockLines = selectedBlock.split('\n');
          const indentedText = blockLines.map((line) => indentStr + line).join('\n');
          const newValue = val.substring(0, lineStart) + indentedText + val.substring(effectiveEnd);

          onChange(newValue);
          const addedChars = indentStr.length * blockLines.length;
          requestAnimationFrame(() => {
            textarea.selectionStart = start + indentStr.length;
            textarea.selectionEnd = end + addedChars;
            updateCursorPosition();
          });
        }
      } else {
        // Outdent (Shift + Tab)
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = val.indexOf('\n', end);
        const effectiveEnd = lineEnd === -1 ? val.length : lineEnd;
        const selectedBlock = val.substring(lineStart, effectiveEnd);

        const blockLines = selectedBlock.split('\n');
        let removedBeforeStart = 0;
        let totalRemoved = 0;

        const outdentedLines = blockLines.map((line, idx) => {
          let removeCount = 0;
          if (line.startsWith('  ')) {
            removeCount = 2;
          } else if (line.startsWith(' ')) {
            removeCount = 1;
          }
          if (idx === 0) {
            removedBeforeStart = Math.min(removeCount, start - lineStart);
          }
          totalRemoved += removeCount;
          return line.substring(removeCount);
        });

        const newValue = val.substring(0, lineStart) + outdentedLines.join('\n') + val.substring(effectiveEnd);
        onChange(newValue);

        requestAnimationFrame(() => {
          textarea.selectionStart = Math.max(lineStart, start - removedBeforeStart);
          textarea.selectionEnd = Math.max(textarea.selectionStart, end - totalRemoved);
          updateCursorPosition();
        });
      }
    }

    // 2. Smart Enter Key Auto-Indentation
    if (e.key === 'Enter') {
      if (readOnly || !onChange) return;
      e.preventDefault();

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      const currentLineStart = val.lastIndexOf('\n', start - 1) + 1;
      const currentLine = val.substring(currentLineStart, start);
      const leadingSpaces = currentLine.match(/^\s*/)?.[0] || '';
      const extraIndent = currentLine.trimEnd().endsWith(':') ? '  ' : '';
      const indentToInsert = '\n' + leadingSpaces + extraIndent;

      const newValue = val.substring(0, start) + indentToInsert + val.substring(end);
      onChange(newValue);

      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + indentToInsert.length;
        updateCursorPosition();
      });
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: height,
        minHeight: embedded ? 0 : 380,
        bgcolor: isDark ? '#0d1117' : '#ffffff',
        borderRadius: embedded ? 0 : 2.5,
        border: embedded ? 'none' : isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
        boxShadow: embedded ? 'none' : isDark ? '0 20px 40px -15px rgba(0, 0, 0, 0.7)' : '0 12px 32px -10px rgba(15, 23, 42, 0.08)',
        overflow: 'hidden',
        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
        flexGrow: 1,
      }}
    >
      {/* ── VS Code Title Bar / Header (Hidden inside Dialogs) ── */}
      {!hideHeader && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1,
            bgcolor: isDark ? '#161b22' : '#f8fafc',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
            userSelect: 'none',
          }}
        >
          {/* Left: Active File Tab */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {!embedded && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mr: 0.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ff5f56' }} />
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ffbd2e' }} />
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#27c93f' }} />
              </Box>
            )}

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.8,
                bgcolor: isDark ? '#0d1117' : '#ffffff',
                px: 1.5,
                py: 0.5,
                borderRadius: '6px 6px 0 0',
                borderTop: `2px solid ${ isDark ? '#38bdf8' : '#0284c7' } `,
                borderLeft: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #e2e8f0',
                borderRight: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #e2e8f0',
              }}
            >
              <CodeIcon sx={{ color: isDark ? '#38bdf8' : '#0284c7', fontSize: 16 }} />
              <Typography
                variant="caption"
                sx={{
                  color: isDark ? '#e6edf3' : '#0f172a',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  fontFamily: 'Consolas, Monaco, monospace',
                }}
              >
                {title}
              </Typography>
              {isModified && (
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: '#f59e0b',
                    ml: 0.2,
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Right: Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label="YAML"
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 700,
                bgcolor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)',
                color: isDark ? '#38bdf8' : '#0284c7',
                border: '1px solid',
                borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(2, 132, 199, 0.25)',
                fontFamily: 'Consolas, monospace',
              }}
            />

            <Chip
              label={`${ lineCount } lines`}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 600,
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
                color: isDark ? '#8b949e' : '#64748b',
                fontFamily: 'Consolas, monospace',
              }}
            />

            {!readOnly && onChange && (
              <Tooltip title="Format / Prettify YAML">
                <IconButton
                  size="small"
                  onClick={handleFormatYaml}
                  sx={{ color: isDark ? '#8b949e' : '#64748b', p: 0.5, '&:hover': { color: isDark ? '#f0f6fc' : '#0f172a', bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' } }}
                >
                  <AutoFixHighIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {isModified && onReset && (
              <Button
                size="small"
                onClick={onReset}
                startIcon={<RestartAltIcon sx={{ fontSize: '0.9rem !important' }} />}
                sx={{
                  height: 24,
                  fontSize: '0.7rem',
                  textTransform: 'none',
                  color: '#f59e0b',
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                  py: 0,
                  px: 1,
                  '&:hover': {
                    bgcolor: 'rgba(245, 158, 11, 0.1)',
                    borderColor: '#f59e0b',
                  },
                }}
                variant="outlined"
              >
                Reset
              </Button>
            )}

            <Tooltip title={copied ? 'Copied!' : 'Copy Manifest'}>
              <IconButton
                size="small"
                onClick={handleCopy}
                sx={{
                  color: copied ? '#34d399' : (isDark ? '#8b949e' : '#64748b'),
                  p: 0.5,
                  '&:hover': { color: isDark ? '#f0f6fc' : '#0f172a', bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                }}
              >
                {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <Box
          sx={{
            px: 2,
            py: 0.75,
            bgcolor: 'rgba(239, 68, 68, 0.15)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <ErrorIcon sx={{ fontSize: '1rem', color: '#ef4444' }} />
          <Typography
            variant="caption"
            sx={{
              color: '#fca5a5',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: '0.75rem',
              fontWeight: 600,
              lineHeight: 1.4,
              wordBreak: 'break-word',
            }}
          >
            {error}
          </Typography>
        </Box>
      )}

      {/* ── Editor Body: Line Numbers Gutter + Interactive Textarea ── */}
      <Box
        sx={{
          display: 'flex',
          flexGrow: 1,
          position: 'relative',
          overflow: 'hidden',
          bgcolor: isDark ? '#0d1117' : '#ffffff',
        }}
      >
        {/* Line Numbers Gutter */}
        <Box
          ref={gutterRef}
          sx={{
            py: 1.5,
            px: 1.5,
            minWidth: 44,
            bgcolor: isDark ? '#0d1117' : '#f8fafc',
            borderRight: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #e2e8f0',
            userSelect: 'none',
            overflow: 'hidden',
            textAlign: 'right',
          }}
        >
          {Array.from({ length: lineCount }).map((_, i) => (
            <Typography
              key={i}
              variant="caption"
              component="div"
              sx={{
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                fontSize: '0.8rem',
                lineHeight: 1.6,
                color: i + 1 === cursorPos.line ? (isDark ? '#58a6ff' : '#0284c7') : (isDark ? '#484f58' : '#94a3b8'),
                fontWeight: i + 1 === cursorPos.line ? 700 : 400,
              }}
            >
              {i + 1}
            </Typography>
          ))}
        </Box>

        {/* Code View & Interactive Textarea Container */}
        <Box
          sx={{
            position: 'relative',
            flexGrow: 1,
            height: '100%',
            overflow: 'hidden',
            bgcolor: isDark ? '#0d1117' : '#ffffff',
          }}
        >
          {/* Syntax Highlighted Underlay */}
          <Box
            ref={preRef}
            component="pre"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              m: 0,
              p: 1.5,
              overflow: 'hidden',
              pointerEvents: 'none',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: '0.8rem',
              lineHeight: 1.6,
              whiteSpace: 'pre',
              color: isDark ? '#c9d1d9' : '#0f172a',
              tabSize: 2,
            }}
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />

          {/* Transparent Editable Textarea Overlay */}
          <Box
            component="textarea"
            ref={textareaRef}
            value={value}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              onChange?.(e.target.value);
              updateCursorPosition();
            }}
            onKeyDown={handleKeyDown}
            onClick={updateCursorPosition}
            onKeyUp={updateCursorPosition}
            onScroll={handleScroll}
            readOnly={readOnly}
            spellCheck={false}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              m: 0,
              p: 1.5,
              border: 'none',
              outline: 'none',
              resize: 'none',
              bgcolor: 'transparent',
              color: 'transparent',
              caretColor: isDark ? '#58a6ff' : '#0284c7',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: '0.8rem',
              lineHeight: 1.6,
              whiteSpace: 'pre',
              tabSize: 2,
              overflow: 'auto',
              WebkitTextFillColor: 'transparent',
              '&::selection': {
                bgcolor: isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(2, 132, 199, 0.2)',
                WebkitTextFillColor: 'transparent',
              },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
