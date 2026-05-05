import type { Settings } from '../types'

interface SettingsPageProps {
  settings: Settings
  onSettingsChange: (patch: Partial<Settings>) => void
}

export function SettingsPage({ settings, onSettingsChange }: SettingsPageProps) {
  return (
    <div className="settings-page">
      <div className="settings-inner">
        <h1 className="settings-heading">Settings</h1>
        <p className="settings-lede">
          Manage your account, appearance, and AI preferences.
        </p>

        <section className="settings-section">
          <h2>Profile</h2>
          <div className="settings-row">
            <label>Creator Username</label>
            <input
              value={settings.creatorUsername}
              onChange={(e) => onSettingsChange({ creatorUsername: e.target.value })}
              placeholder="your-username"
            />
          </div>
          <div className="settings-row">
            <label>Name</label>
            <input defaultValue="Arman Bance" />
          </div>

          <div className="settings-row">
            <label>Email</label>
            <input defaultValue="arman@example.com" />
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
              <option value="1">Film &amp; Animation</option>
              <option value="2">Autos &amp; Vehicles</option>
              <option value="10">Music</option>
              <option value="15">Pets &amp; Animals</option>
              <option value="17">Sports</option>
              <option value="20">Gaming</option>
              <option value="22">People &amp; Blogs</option>
              <option value="23">Comedy</option>
              <option value="24">Entertainment</option>
              <option value="25">News &amp; Politics</option>
              <option value="26">Howto &amp; Style</option>
              <option value="28">Science &amp; Technology</option>
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
