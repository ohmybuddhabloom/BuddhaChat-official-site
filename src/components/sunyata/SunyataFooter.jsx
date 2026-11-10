import { trackCtaClick } from '../../lib/analytics.js'
import { FOOTER_CONTACT_EMAIL, FOOTER_LEGAL_LINKS } from '../../content/footerLinks.js'

function SunyataFooter({ footer }) {
  return (
    <footer className="sunyata-footer">
      <div className="footer-left">
        <h2>
          {footer.titleLine1}
          <br />
          {footer.titleLine2}
        </h2>
        <a
          href={footer.ctaHref || '#path'}
          className="cta-button"
          onClick={() => trackCtaClick('footer_path', 'official')}
        >
          {footer.ctaLabel}
        </a>
      </div>

      <nav className="footer-legal" aria-label="Legal">
        <ul>
          {FOOTER_LEGAL_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
          <li>
            <a href={`mailto:${FOOTER_CONTACT_EMAIL}`}>{FOOTER_CONTACT_EMAIL}</a>
          </li>
        </ul>
        {footer.copyrightLine1 ? (
          <p className="footer-copyright">
            {footer.copyrightLine1}
            {footer.copyrightLine2 ? ` ${footer.copyrightLine2}` : ''}
          </p>
        ) : null}
      </nav>
    </footer>
  )
}

export default SunyataFooter
