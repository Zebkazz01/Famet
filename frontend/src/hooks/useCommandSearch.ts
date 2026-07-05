import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { COMMANDS } from '../config/commands';
import type { Command, Role } from '../config/commands';

function score(cmd: Command, query: string): number {
  if (!query) return 1;
  const q = query.toLowerCase().trim();
  const label = cmd.label.toLowerCase();
  if (label === q) return 1000;
  if (label.startsWith(q)) return 500;
  if (label.includes(q)) return 200;
  for (const kw of cmd.keywords) {
    const k = kw.toLowerCase();
    if (k === q) return 150;
    if (k.startsWith(q)) return 100;
    if (k.includes(q)) return 50;
  }
  // Match en cualquier palabra del label dividido
  const words = label.split(/\s+/);
  for (const w of words) {
    if (w.startsWith(q)) return 80;
  }
  return 0;
}

export interface UseCommandSearchOptions {
  role?: Role | null;
  maxResults?: number;
}

export function useCommandSearch({ role, maxResults = 8 }: UseCommandSearchOptions = {}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);

  // Shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery('');
        setHighlight(0);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const results = useMemo(() => {
    const available = role ? COMMANDS.filter((c) => c.roles.includes(role)) : COMMANDS;
    const scored = available
      .map((c) => ({ cmd: c, s: score(c, query) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, maxResults)
      .map((x) => x.cmd);
    return scored;
  }, [query, role, maxResults]);

  useEffect(() => {
    if (highlight >= results.length) setHighlight(0);
  }, [results, highlight]);

  const run = useCallback((cmd: Command) => {
    let to = cmd.route;
    if (cmd.query) to += `?${cmd.query}`;
    if (cmd.hash) to += `#${cmd.hash}`;
    setOpen(false);
    setQuery('');
    navigate(to);
  }, [navigate]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = results[highlight];
      if (cmd) run(cmd);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }, [results, highlight, run]);

  return { open, setOpen, query, setQuery, results, highlight, setHighlight, run, onKeyDown };
}
