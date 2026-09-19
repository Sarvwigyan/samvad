import React from "react";
import { triggerHaptic } from "../lib/haptics";
import { GlobeIcon, BookIcon, LibraryIcon } from "./ui/Icons";

/**
 * Universal Sarvwigyan Knowledge Ecosystem Ribbon
 * Unifies the 4 pillars of the Sarvwigyan Sovereign Knowledge Tradition:
 * 1. Sarvwigyan Hub (Open Science Core)
 * 2. Sarvpedia (Vedic & Scientific Encyclopedia)
 * 3. Sarvstore (Shastras, Granthas & Journals Repository)
 * 4. Samwad (Interactive Dialogue & Thought Stream — Currently Active)
 */
export function EcosystemBar() {
  const handleLinkClick = () => {
    triggerHaptic(12);
  };

  return (
    <header className="ecosystem-top-ribbon" role="navigation" aria-label="सर्वविज्ञान पारिस्थितिकी तंत्र">
      <div className="ecosystem-ribbon-content">
        <div className="ecosystem-brand-group">
          <span className="ecosystem-motto">✦ सत्यं वद • धर्मं चर • ज्ञानमेव जयते ✦</span>
        </div>

        <nav className="ecosystem-links-row">
          <a
            href="https://sarvwigyan.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="ecosystem-nav-link"
            onClick={handleLinkClick}
            title="सर्वविज्ञान — मुख्य विज्ञान एवं ज्ञान पोर्टल"
          >
            <span className="eco-glyph"><GlobeIcon size={15} /></span>
            <span className="eco-label">सर्वविज्ञान Hub</span>
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
            href="https://sarvwigyan.github.io/sarvstore/"
            target="_blank"
            rel="noopener noreferrer"
            className="ecosystem-nav-link"
            onClick={handleLinkClick}
            title="सर्वसंग्रह — ग्रंथ, शास्त्र एवं शोध-पत्रिकाएँ"
          >
            <span className="eco-glyph"><LibraryIcon size={15} /></span>
            <span className="eco-label">सर्वसंग्रह</span>
          </a>

          <div className="ecosystem-nav-link active-platform" aria-current="page" title="संवाद — सक्रिय विचार-विमर्श मंच">
            <span className="eco-glyph active-chakra">☸</span>
            <span className="eco-label">संवाद</span>
            <span className="active-dot" aria-hidden="true" />
          </div>
        </nav>
      </div>
    </header>
  );
}
