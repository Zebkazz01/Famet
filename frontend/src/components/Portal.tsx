import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FocusTrap } from './FocusTrap';

export function Portal({ children }: { children: ReactNode }) {
  return createPortal(<FocusTrap>{children}</FocusTrap>, document.body);
}
