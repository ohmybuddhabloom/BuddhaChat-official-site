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
  return (
    <section className="app-previews-section" data-testid="app-previews-section">
      <div className="app-previews-shell app-previews-showcase">
        <div className="app-previews-showcase-copy">
          <p className="app-previews-kicker">{showcase.kicker}</p>
          <h2>{showcase.title}</h2>
          <p className="app-previews-lead">{showcase.lead}</p>
          <div className="app-previews-actions">
            <button type="button" className="app-previews-primary">
              {showcase.primaryActionLabel}
            </button>
            <button type="button" className="app-previews-secondary">
              {showcase.secondaryActionLabel}
            </button>
          </div>
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
