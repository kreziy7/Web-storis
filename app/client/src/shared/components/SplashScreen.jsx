import React, { useEffect, useState, useRef } from 'react';
import { useLanguageStore } from '../../store/languageStore';
import { runBoot } from '../utils/bootLoader';
import translations from '../i18n/translations';
import './SplashScreen.css';

const LANG_CONFIG = {
  en: { word: 'LOADING',     width: '7.3em',  tagline: '~ smart-reminder-pwa · offline-first' },
  ru: { word: 'ЗАГРУЗКА',    width: '9.2em',  tagline: '~ умные напоминания · offline-first'  },
  uz: { word: 'YUKLANMOQDA', width: '12.2em', tagline: '~ aqlli eslatmalar · offline-first'   },
};

const SPLASH_KEY = 'sr_splash_done';

export function shouldShowSplash(userId) {
  return sessionStorage.getItem(SPLASH_KEY) !== String(userId);
}

export function markSplashShown(userId) {
  sessionStorage.setItem(SPLASH_KEY, String(userId));
}

const MIN_DISPLAY_MS = 2600; // minimum splash duration
const FADE_MS        = 700;  // fade-out duration

const SplashScreen = ({ onDone, userId }) => {
  const { lang } = useLanguageStore();
  const cfg  = LANG_CONFIG[lang] || LANG_CONFIG.en;
  const bt   = (translations[lang] || translations.en).boot;

  const [step,    setStep]    = useState('step1');
  const [exiting, setExiting] = useState(false);

  // Track both: time elapsed & boot finished
  const bootDone  = useRef(false);
  const timerDone = useRef(false);

  const maybeFinish = () => {
    if (bootDone.current && timerDone.current) {
      setStep('done');
      setTimeout(() => {
        setExiting(true);
        setTimeout(() => {
          markSplashShown(userId);
          onDone();
        }, FADE_MS);
      }, 300); // briefly show "Ready" before fading
    }
  };

  useEffect(() => {
    // Minimum display timer
    const timer = setTimeout(() => {
      timerDone.current = true;
      maybeFinish();
    }, MIN_DISPLAY_MS);

    // Background boot tasks
    runBoot((stepKey) => setStep(stepKey), userId)
      .then(() => {
        bootDone.current = true;
        maybeFinish();
      })
      .catch(() => {
        bootDone.current = true;
        maybeFinish();
      });

    return () => clearTimeout(timer);
  }, []);

  const stepLabel = step === 'done' ? bt.done : bt[step] || '';

  return (
    <div className={`splash-overlay${exiting ? ' splash-exit' : ''}`}>
      <div className="loader" style={{ '--word-width': cfg.width }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="text">
            <span>{cfg.word}</span>
          </div>
        ))}
        <div className="line" />
      </div>

      {/* Step status */}
      <div className="splash-steps">
        <span className={`splash-step-text ${step === 'done' ? 'step-done' : ''}`}>
          {step === 'done' ? `✓ ${stepLabel}` : stepLabel}
        </span>
        {step !== 'done' && <span className="splash-step-dots" />}
      </div>

      <span className="splash-tagline">{cfg.tagline}</span>
    </div>
  );
};

export default SplashScreen;
