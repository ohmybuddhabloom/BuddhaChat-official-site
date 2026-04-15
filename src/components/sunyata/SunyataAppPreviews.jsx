import { useState } from 'react'

import { submitDownloadLead } from '../../lib/siteApi.js'

function AppPreviewCard({ imageSrc, imageAlt, className }) {
  return (
    <article className={`app-preview-phone ${className}`}>
      <div className="app-preview-frame">
        <div className="app-preview-island" aria-hidden="true" />
        <div className="app-preview-screen">
          <img src={imageSrc} alt={imageAlt} loading="lazy" />
        </div>
      </div>
    </article>
  )
}

const PHONE_CLASS_BY_LAYOUT = {
  left: 'is-back-left',
  center: 'is-center',
  right: 'is-back-right',
}

function SunyataAppPreviews({ showcase }) {
  const [reserveOpen, setReserveOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [submitState, setSubmitState] = useState('idle')
  const [submitError, setSubmitError] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextEmail = email.trim()

    if (!nextEmail) {
      setSubmitError('Please leave your email so we can send the app link.')
      return
    }

    try {
      setSubmitState('submitting')
      setSubmitError('')

      const result = await submitDownloadLead({
        email: nextEmail,
      })

      setSubmitState('submitted')
      setDownloadUrl(result.downloadUrl ?? '')
    } catch (error) {
      setSubmitState('idle')
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Unable to save your email right now.',
      )
    }
  }

  return (
    <section className="app-previews-section" data-testid="app-previews-section">
      <div className="app-previews-shell app-previews-showcase">
        <div className="app-previews-showcase-copy">
          <p className="app-previews-kicker">{showcase.kicker}</p>
          <h2>{showcase.title}</h2>
          <p className="app-previews-lead">{showcase.lead}</p>
          <div className="app-previews-actions">
            <button
              type="button"
              className="app-previews-primary"
              onClick={() => setReserveOpen((current) => !current)}
            >
              {showcase.primaryActionLabel}
            </button>
            <button type="button" className="app-previews-secondary">
              {showcase.secondaryActionLabel}
            </button>
          </div>
          {reserveOpen ? (
            <div className="app-previews-reserve" data-testid="app-previews-reserve">
              <div className="app-previews-reserve-copy">
                <p>Reserve Your Invite</p>
                <span>
                  Leave your email and we will send the current app access path to
                  your inbox.
                </span>
              </div>

              <div className="app-previews-reserve-panel">
                {submitState === 'submitted' ? (
                  <div className="app-previews-reserve-confirmed" role="status">
                    {downloadUrl
                      ? 'Email saved. Your app link is ready below.'
                      : 'Email saved. We will send the app link soon.'}
                  </div>
                ) : (
                  <form className="app-previews-reserve-form" onSubmit={handleSubmit}>
                    <label className="sr-only" htmlFor="app-preview-email">
                      Leave your email to get the app link
                    </label>
                    <input
                      id="app-preview-email"
                      type="email"
                      value={email}
                      placeholder="Enter your email"
                      onChange={(event) => setEmail(event.target.value)}
                    />
                    <button type="submit" disabled={submitState === 'submitting'}>
                      {submitState === 'submitting' ? 'Saving' : 'Submit'}
                    </button>
                  </form>
                )}

                {submitState === 'submitted' && downloadUrl ? (
                  <a
                    className="app-previews-download-link"
                    href={downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open download link
                  </a>
                ) : null}

                {submitError ? (
                  <p className="app-previews-error" role="alert">
                    {submitError}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="app-previews-proof">
            <div className="app-previews-proof-stack" aria-hidden="true">
              {showcase.proofAvatars?.map((avatar, index) => (
                <span key={`${avatar.src}-${index}`}>
                  <img src={avatar.src} alt={avatar.alt} loading="lazy" />
                </span>
              ))}
            </div>
            <p>{showcase.proofText}</p>
          </div>
        </div>

        <div className="app-previews-waterfall">
          {showcase.phones.map((item) => (
            <AppPreviewCard
              key={item.key}
              imageSrc={item.imageSrc}
              imageAlt={item.imageAlt}
              className={PHONE_CLASS_BY_LAYOUT[item.layout] ?? 'is-center'}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default SunyataAppPreviews
