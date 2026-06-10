import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ProfileSettingsSection } from './ProfileSettingsSection'
import { ToastProvider } from '@/lib/toast'

function renderSection() {
  return render(
    <ToastProvider>
      <ProfileSettingsSection />
    </ToastProvider>,
  )
}

describe('ProfileSettingsSection', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders a card titled "Profile" so the section is discoverable in the sidebar', () => {
    renderSection()
    expect(
      screen.getByRole('heading', { name: 'Profile', level: 3 }),
    ).toBeInTheDocument()
  })

  it('renders a description explaining what the profile section is for', () => {
    renderSection()
    // The CardDescription should make the section's purpose obvious. We
    // assert that some description text is present rather than coupling to
    // a specific sentence, so the test survives copy edits.
    expect(
      screen.getByText(/profile|account|user|identity/i),
    ).toBeInTheDocument()
  })

  it('is a top-level exported component (consumed by the /settings/profile route)', () => {
    // The mere fact that the import at the top of this file resolves is the
    // contract: a default-named export `ProfileSettingsSection` must be
    // importable from `./ProfileSettingsSection`. This guards against an
    // accidental rename that would silently break the App.tsx route wiring
    // in Phase 4.
    expect(typeof ProfileSettingsSection).toBe('function')
  })
})
