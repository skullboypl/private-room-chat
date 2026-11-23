'use client';

import { GitHubIcon } from '@/components/icons/GitHubIcon';
import { GITHUB_REPO } from '@/lib/siteFooterShared';
import { useOptionalTranslation } from '@/context/LocaleContext';
import './FooterGitHubLink.css';

export default function FooterGitHubLink({ className = '', lang }) {
  const { t } = useOptionalTranslation(lang);

  return (
    <div className={['footer-github', className].filter(Boolean).join(' ')}>
      <a
        href={GITHUB_REPO.url}
        className="footer-github__btn"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('footer.githubAria')}
      >
        <GitHubIcon className="footer-github__icon" aria-hidden="true" />
        <span className="footer-github__label">{t('footer.github')}</span>
      </a>
    </div>
  );
}
