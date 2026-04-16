/**
 * PaymentCardForm.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Drop-in React component for the payment-card checkout form.
 *
 * REQUIREMENTS
 *   React 17+ or 18+  (hooks: useState, useCallback)
 *   CSS:  import '../css/payment-card.css'   (or payment-card.scss with Sass)
 *
 * USAGE
 * ─────
 *   import PaymentCardForm from './react/PaymentCardForm';
 *
 *   <PaymentCardForm
 *     onSuccess={(data) => console.log('Charge card:', data)}
 *     onError={(errs) => console.warn('Validation failed', errs)}
 *   />
 *
 * PROPS
 * ─────
 *   onSuccess  (data: CardPayload) => void
 *     Called when all fields pass validation and the user submits.
 *     data = { name, number, expiry, cvv, cardType }
 *
 *   onError    (errors: string[]) => void
 *     Called when the user submits with one or more invalid fields.
 *
 *   accentColor  string  (optional)
 *     CSS colour value.  Overrides --pc-accent at the component root.
 *     Example: accentColor="#7c3aed"
 *
 *   cardBgFrom / cardBgTo / cardBgEnd  string  (optional)
 *     Override the three card-face gradient stops.
 *
 *   logoElement  ReactNode  (optional)
 *     Custom watermark. Defaults to a simple house SVG.
 *     Example: logoElement={<img src="/logo.svg" alt="" />}
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback } from 'react';
// Import the compiled CSS (adjust path as needed)
// import '../css/payment-card.css';

// ── Helpers (same logic as vanilla payment-card.js) ──────────────────────────

function detectNetwork(digits) {
  if (/^4/.test(digits))               return 'visa';
  if (/^5[1-5]|^2[2-7]/.test(digits)) return 'mc';
  if (/^3[47]/.test(digits))           return 'amex';
  if (/^6/.test(digits))               return 'discover';
  return '';
}

function formatCardNumber(raw, network) {
  const digits = raw.replace(/\D/g, '');
  if (network === 'amex') {
    return digits.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(' ')
    );
  }
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').slice(0, 19);
}

function formatExpiry(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 3) return digits.slice(0, 2) + ' / ' + digits.slice(2, 4);
  return digits;
}

function maskPAN(digits, network) {
  if (!digits) return '•••• •••• •••• ••••';
  const groups = network === 'amex' ? [4, 6, 5] : [4, 4, 4, 4];
  let result = '', idx = 0;
  groups.forEach((len, gi) => {
    const isLast = gi === groups.length - 1;
    for (let i = 0; i < len; i++) {
      if (idx < digits.length) {
        result += (isLast || idx >= digits.length - 4) ? digits[idx] : '•';
      } else { result += '•'; }
      idx++;
    }
    if (gi < groups.length - 1) result += ' ';
  });
  return result;
}

function validateExpiry(formatted) {
  const digits = formatted.replace(/\D/g, '');
  if (digits.length < 4) return null; // incomplete, not an error yet
  const mm    = parseInt(digits.slice(0, 2), 10);
  const yy    = parseInt(digits.slice(2), 10);
  const now   = new Date();
  const nowYY = now.getFullYear() % 100;
  const nowMM = now.getMonth() + 1;
  return mm >= 1 && mm <= 12 && (yy > nowYY || (yy === nowYY && mm >= nowMM));
}

// ── SVG assets ────────────────────────────────────────────────────────────────

const CardBadges = {
  visa: (
    <svg viewBox="0 0 48 16" xmlns="http://www.w3.org/2000/svg">
      <text x="1" y="13" fontFamily="Arial,sans-serif" fontSize="15"
            fontWeight="700" fontStyle="italic" fill="#fff" letterSpacing="-0.5">VISA</text>
    </svg>
  ),
  mc: (
    <svg viewBox="0 0 48 30" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="15" r="12" fill="#eb001b" opacity="0.92"/>
      <circle cx="30" cy="15" r="12" fill="#f79e1b" opacity="0.88"/>
      <path d="M24 6.5a12 12 0 0 1 0 17A12 12 0 0 1 24 6.5z" fill="#ff5f00" opacity="0.9"/>
    </svg>
  ),
  amex: (
    <svg viewBox="0 0 48 20" xmlns="http://www.w3.org/2000/svg">
      <text x="1" y="15" fontFamily="Arial,sans-serif" fontSize="11"
            fontWeight="700" fill="#fff" letterSpacing="0.5">AMEX</text>
    </svg>
  ),
  discover: (
    <svg viewBox="0 0 48 20" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="14" fontFamily="Arial,sans-serif" fontSize="9"
            fontWeight="700" fill="#f79e1b" letterSpacing="0.3">DISCOVER</text>
    </svg>
  ),
};

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 8.5l3.5 3.5L13 5" stroke="#3da86a" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CardIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="4" width="14" height="10" rx="2" stroke="white" strokeWidth="1.5"/>
    <path d="M1 7h14" stroke="white" strokeWidth="1.5"/>
    <path d="M4 10h3" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const DefaultLogo = () => (
  <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
    <path d="M100 280 L100 185 L200 100 L300 185 L300 280 Z"
          fill="none" stroke="white" strokeWidth="22" strokeLinejoin="round"/>
    <rect x="148" y="215" width="104" height="65" rx="10" fill="white"/>
    <rect x="100" y="200" width="48" height="48" rx="8" fill="white" opacity="0.6"/>
  </svg>
);

// ── Field state machine ───────────────────────────────────────────────────────
// Each field can be: 'idle' | 'success' | 'error'

const IDLE    = 'idle';
const SUCCESS = 'success';
const ERROR   = 'error';

// ── Component ─────────────────────────────────────────────────────────────────

export default function PaymentCardForm({
  onSuccess,
  onError,
  accentColor,
  cardBgFrom,
  cardBgTo,
  cardBgEnd,
  logoElement,
}) {
  // Form values
  const [name,    setName]    = useState('');
  const [numRaw,  setNumRaw]  = useState('');   // raw digits only
  const [numFmt,  setNumFmt]  = useState('');   // formatted display value
  const [exp,     setExp]     = useState('');
  const [cvv,     setCvv]     = useState('');

  // Field validation states
  const [nameState, setNameState] = useState(IDLE);
  const [numState,  setNumState]  = useState(IDLE);
  const [expState,  setExpState]  = useState(IDLE);
  const [cvvState,  setCvvState]  = useState(IDLE);

  // Hint messages
  const [nameHint, setNameHint] = useState('');
  const [numHint,  setNumHint]  = useState('');
  const [expHint,  setExpHint]  = useState('');
  const [cvvHint,  setCvvHint]  = useState('');

  // Submit button state
  const [btnState, setBtnState] = useState('idle'); // 'idle' | 'success' | 'error'

  // Derived
  const network  = detectNetwork(numRaw);
  const maxNumLen = network === 'amex' ? 15 : 16;
  const maxCvvLen = network === 'amex' ? 4 : 3;

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleNameChange = useCallback((e) => {
    const val = e.target.value;
    setName(val);
    const hasTwo = val.trim().split(' ').filter(Boolean).length >= 2;
    if (hasTwo && val.length > 3) {
      setNameState(SUCCESS);
      setNameHint('');
    } else {
      setNameState(IDLE);
    }
  }, []);

  const handleNameBlur = useCallback(() => {
    if (name && (name.trim().split(' ').filter(Boolean).length < 2 || name.length < 4)) {
      setNameState(ERROR);
      setNameHint('Enter first and last name');
    }
  }, [name]);

  const handleNumChange = useCallback((e) => {
    const raw     = e.target.value.replace(/\D/g, '').slice(0, 16);
    const net     = detectNetwork(raw);
    const maxLen  = net === 'amex' ? 15 : 16;
    const display = formatCardNumber(e.target.value, net);

    setNumRaw(raw);
    setNumFmt(display);

    if (raw.length === maxLen) {
      setNumState(SUCCESS);
      setNumHint('');
    } else if (raw.length > 0) {
      setNumState(IDLE);
    }
  }, []);

  const handleNumBlur = useCallback(() => {
    if (numRaw && numRaw.length < maxNumLen) {
      setNumState(ERROR);
      setNumHint('Incomplete card number');
    }
  }, [numRaw, maxNumLen]);

  const handleExpChange = useCallback((e) => {
    const formatted = formatExpiry(e.target.value);
    setExp(formatted);

    const valid = validateExpiry(formatted);
    if (valid === true)  { setExpState(SUCCESS); setExpHint(''); }
    else if (valid === false) { setExpState(ERROR); setExpHint('Card expired'); }
    else                 { setExpState(IDLE); setExpHint(''); }
  }, []);

  const handleCvvChange = useCallback((e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, maxCvvLen);
    setCvv(digits);
    if (digits.length === maxCvvLen) { setCvvState(SUCCESS); setCvvHint(''); }
    else                             { setCvvState(IDLE); }
  }, [maxCvvLen]);

  const handleCvvBlur = useCallback(() => {
    if (cvv && cvv.length < maxCvvLen) {
      setCvvState(ERROR);
      setCvvHint(`${maxCvvLen} digits required`);
    }
  }, [cvv, maxCvvLen]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const allValid = [nameState, numState, expState, cvvState].every(s => s === SUCCESS);

    if (allValid) {
      setBtnState('success');
      if (typeof onSuccess === 'function') {
        onSuccess({ name, number: numRaw, expiry: exp, cvv, cardType: network });
      }
    } else {
      setBtnState('error');
      const errors = [];
      if (nameState !== SUCCESS) errors.push('Cardholder name is required');
      if (numState  !== SUCCESS) errors.push('Valid card number is required');
      if (expState  !== SUCCESS) errors.push('Valid expiry date is required');
      if (cvvState  !== SUCCESS) errors.push('CVV is required');

      if (typeof onError === 'function') onError(errors);

      setTimeout(() => setBtnState('idle'), 2000);
    }
  }, [nameState, numState, expState, cvvState, name, numRaw, exp, cvv, network, onSuccess, onError]);

  // ── CSS variable overrides via inline style ──────────────────────────────
  const styleOverrides = {
    ...(accentColor && { '--pc-accent': accentColor }),
    ...(cardBgFrom  && { '--pc-card-bg-from': cardBgFrom }),
    ...(cardBgTo    && { '--pc-card-bg-to':   cardBgTo }),
    ...(cardBgEnd   && { '--pc-card-bg-end':  cardBgEnd }),
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="pc-wrap" style={styleOverrides} role="region" aria-label="Payment details">

      {/* Screen-reader heading */}
      <h2 className="pc-sr-only">Enter your payment card details</h2>

      {/* ── Card preview ── */}
      <div className="pc-card" aria-hidden="true">
        <div className="pc-card-logo">
          {logoElement || <DefaultLogo />}
        </div>
        <div className="pc-card-chip" />
        <div className="pc-card-number">
          {maskPAN(numRaw, network)}
        </div>
        <div className="pc-card-bottom">
          <div>
            <div className="pc-card-label">Cardholder</div>
            <div className="pc-card-value">{name || 'Full Name'}</div>
          </div>
          <div>
            <div className="pc-card-label">Expires</div>
            <div className="pc-card-value">{exp || 'MM / YY'}</div>
          </div>
          <div className="pc-card-type">
            {network && CardBadges[network]}
          </div>
        </div>
      </div>

      {/* ── Form ── */}
      <form className="pc-form" onSubmit={handleSubmit} noValidate>

        {/* Name */}
        <div className="pc-field">
          <label htmlFor="pcName">Cardholder name</label>
          <div className="pc-input-wrap has-icon">
            <input
              type="text"
              id="pcName"
              value={name}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              placeholder="Jane Smith"
              autoComplete="cc-name"
              maxLength={26}
              className={nameState !== IDLE ? nameState : ''}
              aria-required="true"
              aria-describedby="pcNameHint"
            />
            {nameState === SUCCESS && (
              <span className="pc-icon visible" aria-hidden="true"><CheckIcon /></span>
            )}
          </div>
          <span className={`pc-hint${nameState === ERROR ? ' error' : ''}`}
                id="pcNameHint" role="alert">
            {nameHint}
          </span>
        </div>

        {/* Card Number */}
        <div className="pc-field">
          <label htmlFor="pcNum">Card number</label>
          <div className="pc-input-wrap has-icon">
            <input
              type="tel"
              id="pcNum"
              value={numFmt}
              onChange={handleNumChange}
              onBlur={handleNumBlur}
              placeholder="0000 0000 0000 0000"
              autoComplete="cc-number"
              maxLength={19}
              inputMode="numeric"
              className={numState !== IDLE ? numState : ''}
              aria-required="true"
              aria-describedby="pcNumHint"
            />
            {numState === SUCCESS && (
              <span className="pc-icon visible" aria-hidden="true"><CheckIcon /></span>
            )}
            {numState !== SUCCESS && network && (
              <span className="pc-icon visible" aria-hidden="true">
                {CardBadges[network]}
              </span>
            )}
          </div>
          <span className={`pc-hint${numState === ERROR ? ' error' : ''}`}
                id="pcNumHint" role="alert">
            {numHint}
          </span>
        </div>

        {/* Expiry + CVV */}
        <div className="pc-row">
          <div className="pc-field">
            <label htmlFor="pcExp">Expiry date</label>
            <div className="pc-input-wrap">
              <input
                type="tel"
                id="pcExp"
                value={exp}
                onChange={handleExpChange}
                placeholder="MM / YY"
                autoComplete="cc-exp"
                maxLength={7}
                inputMode="numeric"
                className={expState !== IDLE ? expState : ''}
                aria-required="true"
                aria-describedby="pcExpHint"
              />
            </div>
            <span className={`pc-hint${expState === ERROR ? ' error' : ''}`}
                  id="pcExpHint" role="alert">
              {expHint}
            </span>
          </div>

          <div className="pc-field">
            <label htmlFor="pcCvv">CVV</label>
            <div className="pc-input-wrap">
              <input
                type="tel"
                id="pcCvv"
                value={cvv}
                onChange={handleCvvChange}
                onBlur={handleCvvBlur}
                placeholder="•••"
                autoComplete="cc-csc"
                maxLength={4}
                inputMode="numeric"
                className={cvvState !== IDLE ? cvvState : ''}
                aria-required="true"
                aria-describedby="pcCvvHint"
              />
            </div>
            <span className={`pc-hint${cvvState === ERROR ? ' error' : ''}`}
                  id="pcCvvHint" role="alert">
              {cvvHint}
            </span>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className={`pc-btn${btnState !== 'idle' ? ` state-${btnState}` : ''}`}
          disabled={btnState === 'success'}
        >
          {btnState === 'success' ? (
            '✓ Payment accepted!'
          ) : btnState === 'error' ? (
            'Please fix errors above'
          ) : (
            <>
              <CardIcon />
              Pay securely
            </>
          )}
        </button>

      </form>
    </div>
  );
}
