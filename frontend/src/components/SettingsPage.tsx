import type { User } from '@supabase/supabase-js'
import type { Settings } from '../types'
import {
  formatCreatorUsername,
  getUserAvatarUrl,
  getUserDisplayName,
  getUserInitials,
} from '../lib/userProfile'
import { EXPLORE_CATEGORIES } from '../lib/exploreCategories'

interface SettingsPageProps {
  settings: Settings
  onSettingsChange: (patch: Partial<Settings>) => void
  onBack: () => void
  user: User | null
}

export function SettingsPage({ settings, onSettingsChange, onBack, user }: SettingsPageProps) {
  const displayName = getUserDisplayName(user)
  const avatarUrl = getUserAvatarUrl(user)

  return (
    <div className="settings-page">
      <div className="settings-inner">
        <button className="settings-back" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <h1 className="settings-heading">Settings</h1>
        <p className="settings-lede">
          Manage your account, appearance, and AI preferences.
        </p>

        <section className="settings-section">
          <h2>Profile</h2>
          <div className="settings-profile-card">
            {avatarUrl ? (
              <img className="profile-avatar profile-avatar-large" src={avatarUrl} alt="" />
            ) : (
              <div className="profile-avatar profile-avatar-large" aria-hidden="true">
                {getUserInitials(user)}
              </div>
            )}
            <div>
              <div className="settings-profile-name">{displayName}</div>
              <div className="settings-profile-meta">
                {formatCreatorUsername(settings.creatorUsername) || user?.email}
              </div>
            </div>
          </div>
          <div className="settings-row">
            <label>Creator Username</label>
            <input
              value={settings.creatorUsername}
              onChange={(e) => {
                const creatorUsername = e.target.value.trimStart().replace(/^@+/, '')
                onSettingsChange({ creatorUsername })
              }}
              placeholder="your-username"
              autoComplete="username"
            />
          </div>
          <div className="settings-row">
            <label>Name</label>
            <input value={displayName} readOnly />
          </div>

          <div className="settings-row">
            <label>Email</label>
            <input value={user?.email ?? ''} readOnly />
          </div>
        </section>

        <section className="settings-section">
          <h2>Appearance</h2>
          <div className="settings-row">
            <label>Theme</label>
            <select defaultValue="paper">
              <option value="paper">Paper</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
          <div className="settings-row">
            <label>Editor font size</label>
            <select defaultValue="17">
              <option value="15">15px</option>
              <option value="17">17px</option>
              <option value="19">19px</option>
            </select>
          </div>
        </section>

        <section className="settings-section">
          <h2>AI Assistant</h2>

          <div className="settings-row">
            <label>Tone</label>
            <select defaultValue="friendly">
              <option value="friendly">Friendly</option>
              <option value="concise">Concise</option>
              <option value="formal">Formal</option>
            </select>
          </div>
          <div className="settings-row settings-row-toggle">
            <label>Suggest B-roll automatically</label>
            <input type="checkbox" defaultChecked />
          </div>
          <div className="settings-row settings-row-toggle">
            <label>Save drafts to cloud</label>
            <input type="checkbox" />
          </div>
        </section>

        <section className="settings-section">
          <h2>Explore</h2>
          <div className="settings-row">
            {/* video category for the explore page */}
            <label>Video category</label>
            <select
              value={settings.categoryId ?? ''}
              onChange={(e) => {
                const val = e.target.value
                // convert back to null if they pick "all"
                onSettingsChange({ categoryId: val === '' ? null : Number(val) })
              }}
            >
              <option value="">All (no filter)</option>
              {EXPLORE_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="settings-section settings-danger">
          <h2>Danger zone</h2>
          <button className="btn-danger">Delete account</button>
        </section>
      </div>
    </div>
  )
}
