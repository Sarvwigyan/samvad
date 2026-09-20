import React from "react";
import { triggerHaptic } from "../lib/haptics";
import { useAuth } from "../context/AuthContext";
import { getEcosystemAppUrl } from "../lib/sso";
import { GlobeIcon, BookIcon, LibraryIcon } from "./ui/Icons";

/**
 * Universal Sarvwigyan Knowledge Ecosystem Ribbon with Unified SSO
 * Unifies the 4 pillars of the Sarvwigyan Sovereign Knowledge Tradition:
 * 1. Sarvwigyan Hub (Open Science Core)
 * 2. Sarvpedia (Vedic & Scientific Encyclopedia)
 * 3. Sarvstore (Shastras, Granthas & Swadeshi Digital Goods)
 * 4. Samwad (Interactive Dialogue & Thought Stream — Active Platform)
 */
function EcosystemBarComponent() {
  const { currentUser, userProfile } = useAuth();

  const handleLinkClick = () => {
    triggerHaptic(12);
  };

  const sarvwigyanUrl = getEcosystemAppUrl("sarvwigyan", currentUser);
  const sarvstoreUrl = getEcosystemAppUrl("sarvstore", currentUser);

  return (
    <div className="ecosystem-top-ribbon" role="region" aria-label="सर्वविज्ञान पारिस्थितिकी तंत्र">
      <div className="ecosystem-ribbon-content">
        <div className="ecosystem-brand-group">
          <span className="ecosystem-motto">✦ सत्यं वद • धर्मं चर • ज्ञानमेव जयते ✦</span>
          {currentUser && (
            <span className="ecosystem-sso-indicator" title="एकीकृत परिचय सक्रिय (Unified Ecosystem SSO Active)">
              <span className="sso-dot" />
              <span className="sso-label">एकीकृत परिचय</span>
            </span>
          )}
        </div>

        <nav className="ecosystem-links-row" aria-label="पारिस्थितिकी तंत्र लिंक">
          <a
            href={sarvwigyanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ecosystem-nav-link"
            onClick={handleLinkClick}
            title="सर्वविज्ञान — मुख्य विज्ञान एवं ज्ञान पोर्टल"
          >
            <span className="eco-glyph"><GlobeIcon size={15} /></span>
            <span className="eco-label">सर्वविज्ञान</span>
          </a>

          <a
            href="https://sarvwigyan.github.io/sarvpedia/"
            target="_blank"
            rel="noopener noreferrer"
            className="ecosystem-nav-link"
            onClick={handleLinkClick}
            title="सर्वपीडिया — वैदिक एवं आधुनिक ज्ञानकोश"
          >
            <span className="eco-glyph"><BookIcon size={15} /></span>
            <span className="eco-label">सर्वपीडिया</span>
          </a>

          <a
            href={sarvstoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ecosystem-nav-link"
            onClick={handleLinkClick}
            title="सर्वस्टोर — ग्रंथ, शास्त्र एवं स्वदेशी डिजिटल भंडार"
          >
            <span className="eco-glyph"><LibraryIcon size={15} /></span>
            <span className="eco-label">सर्वस्टोर</span>
          </a>

          <div className="ecosystem-nav-link active-platform" aria-current="page" title="संवाद — सक्रिय विचार-विमर्श मंच">
            <span className="eco-glyph active-chakra">☸</span>
            <span className="eco-label">संवाद</span>
            <span className="active-dot" aria-hidden="true" />
          </div>
        </nav>
      </div>
    </div>
  );
}

export const EcosystemBar = React.memo(EcosystemBarComponent);
