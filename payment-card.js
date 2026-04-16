/**
 * payment-card.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Framework-agnostic controller for the payment-card component.
 *
 * Usage (vanilla HTML):
 *   <script src="payment-card.js"></script>
 *   The script auto-initialises on DOMContentLoaded.
 *
 * Usage (ES module / bundler):
 *   import { initPaymentCard } from './payment-card.js';
 *   initPaymentCard();                  // uses default IDs
 *   initPaymentCard({ form: '#myForm' });  // custom selector
 *
 * Usage (React): see react/PaymentCardForm.jsx — that file wraps this logic
 *   in a React component using useRef + useEffect so no DOM querying is needed.
 *
 * PUBLIC API
 * ──────────
 *   initPaymentCard(options?)  →  { destroy() }
 *
 *   options {
 *     nameId?   string  — id of cardholder name input   (default: 'pcName')
 *     numId?    string  — id of card number input        (default: 'pcNum')
 *     expId?    string  — id of expiry input             (default: 'pcExp')
 *     cvvId?    string  — id of CVV input                (default: 'pcCvv')
 *     formId?   string  — id of <form> element           (default: 'pcForm')
 *     onSuccess?  (formData: object) => void  — called when all fields valid
 *     onError?    (errors: string[]) => void  — called when submit fails
 *   }
 *
 * EVENTS
 * ──────
 *   The form element dispatches two custom events:
 *     'pc:valid'   — detail: { name, number, expiry, cvv, cardType }
 *     'pc:invalid' — detail: { errors: string[] }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Card network SVG badges (inline, no external dependency) ────────────────
const CARD_BADGES = {
  visa: `<svg viewBox="0 0 48 16" xmlns="http://www.w3.org/2000/svg">
           <text x="1" y="13" font-family="Arial,sans-serif" font-size="15"
                 font-weight="700" font-style="italic" fill="#fff" letter-spacing="-0.5">VISA</text>
         </svg>`,

  mc:   `<svg viewBox="0 0 48 30" xmlns="http://www.w3.org/2000/svg">
           <circle cx="18" cy="15" r="12" fill="#eb001b" opacity="0.92"/>
           <circle cx="30" cy="15" r="12" fill="#f79e1b" opacity="0.88"/>
           <path d="M24 6.5a12 12 0 0 1 0 17A12 12 0 0 1 24 6.5z" fill="#ff5f00" opacity="0.9"/>
         </svg>`,

  amex: `<svg viewBox="0 0 48 20" xmlns="http://www.w3.org/2000/svg">
           <text x="1" y="15" font-family="Arial,sans-serif" font-size="11"
                 font-weight="700" fill="#fff" letter-spacing="0.5">AMEX</text>
         </svg>`,

  discover: `<svg viewBox="0 0 48 20" xmlns="http://www.w3.org/2000/svg">
               <text x="0" y="14" font-family="Arial,sans-serif" font-size="9"
                     font-weight="700" fill="#f79e1b" letter-spacing="0.3">DISCOVER</text>
             </svg>`,
};

const CHECK_SVG = `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 8.5l3.5 3.5L13 5" stroke="#3da86a" stroke-width="1.8"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Detect card network from a raw digit string.
 * Returns one of: 'visa' | 'mc' | 'amex' | 'discover' | ''
 */
function detectNetwork(digits) {
  if (/^4/.test(digits))            return 'visa';
  if (/^5[1-5]|^2[2-7]/.test(digits)) return 'mc';
  if (/^3[47]/.test(digits))        return 'amex';
  if (/^6/.test(digits))            return 'discover';
  return '';
}

/**
 * Format a card number string with spaces.
 * Amex: 4-6-5  |  all others: 4-4-4-4
 */
function formatCardNumber(raw, network) {
  const digits = raw.replace(/\D/g, '');
  if (network === 'amex') {
    return digits.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(' ')
    );
  }
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').slice(0, 19);
}

/**
 * Format an expiry string to "MM / YY".
 */
function formatExpiry(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 3) return digits.slice(0, 2) + ' / ' + digits.slice(2, 4);
  return digits;
}

/**
 * Mask all but the last 4 digits of a PAN for the card preview.
 */
function maskPAN(digits, network) {
  if (!digits) return '•••• •••• •••• ••••';
  const groups = network === 'amex' ? [4, 6, 5] : [4, 4, 4, 4];
  let result = '';
  let idx = 0;

  groups.forEach((len, gi) => {
    const isLast = gi === groups.length - 1;
    for (let i = 0; i < len; i++) {
      if (idx < digits.length) {
        // Show last 4 digits; mask the rest
        result += (isLast || idx >= digits.length - 4) ? digits[idx] : '•';
      } else {
        result += '•';
      }
      idx++;
    }
    if (gi < groups.length - 1) result += ' ';
  });

  return result;
}

/**
 * Set the text content and CSS class of a hint element.
 * @param {HTMLElement} el
 * @param {string} message
 * @param {'error'|'success'|''} type
 */
function setHint(el, message, type = '') {
  el.textContent = message;
  el.className = ['pc-hint', type].filter(Boolean).join(' ');
}

// ── Main initialiser ─────────────────────────────────────────────────────────

/**
 * Attach all event listeners and live-preview logic to the component.
 *
 * @param {object} [options]
 * @returns {{ destroy: () => void }}
 */
function initPaymentCard(options = {}) {
  const ids = {
    name:   options.nameId  || 'pcName',
    num:    options.numId   || 'pcNum',
    exp:    options.expId   || 'pcExp',
    cvv:    options.cvvId   || 'pcCvv',
    form:   options.formId  || 'pcForm',
    // preview elements
    dispNum:  'pcDisplayNum',
    dispName: 'pcDisplayName',
    dispExp:  'pcDisplayExp',
    cardType: 'pcCardType',
    nameIcon: 'pcNameIcon',
    numIcon:  'pcNumIcon',
    submit:   'pcSubmit',
  };

  const el = {};
  Object.entries(ids).forEach(([key, id]) => {
    el[key] = document.getElementById(id);
  });

  // Internal state
  let state = { name: '', num: '', exp: '', cvv: '', network: '' };

  // ── Name ──────────────────────────────────────────────────────────────────
  function onNameInput(e) {
    state.name = e.target.value;
    el.dispName.textContent = state.name || 'Full Name';

    const hasTwo = state.name.trim().split(' ').filter(Boolean).length >= 2;
    if (hasTwo && state.name.length > 3) {
      e.target.className = 'success';
      el.nameIcon.innerHTML = CHECK_SVG;
      el.nameIcon.className = 'pc-icon visible';
      setHint(document.getElementById('pcNameHint'), '', '');
    } else {
      e.target.className = '';
      el.nameIcon.className = 'pc-icon';
    }
  }

  function onNameBlur(e) {
    const hasTwo = state.name.trim().split(' ').filter(Boolean).length >= 2;
    if (state.name && (!hasTwo || state.name.length < 4)) {
      e.target.className = 'error';
      setHint(document.getElementById('pcNameHint'), 'Enter first and last name', 'error');
    }
  }

  // ── Card Number ───────────────────────────────────────────────────────────
  function onNumInput(e) {
    const raw     = e.target.value.replace(/\D/g, '').slice(0, 16);
    const network = detectNetwork(raw);
    state.num     = raw;
    state.network = network;
    const maxLen  = network === 'amex' ? 15 : 16;

    e.target.value = formatCardNumber(e.target.value, network);
    el.dispNum.textContent = maskPAN(raw, network);

    // Update card-type badge on the preview face
    el.cardType.innerHTML = network ? (CARD_BADGES[network] || '') : '';

    if (raw.length === maxLen) {
      e.target.className = 'success';
      el.numIcon.innerHTML = CHECK_SVG;
      el.numIcon.className = 'pc-icon visible';
      setHint(document.getElementById('pcNumHint'), '', '');
    } else if (network) {
      e.target.className = '';
      // Show a small text label inside the icon slot while typing
      el.numIcon.innerHTML = `<span style="font-size:9px;font-weight:600;color:var(--pc-label);text-transform:uppercase">${network}</span>`;
      el.numIcon.className = 'pc-icon visible';
    } else {
      e.target.className = '';
      el.numIcon.className = 'pc-icon';
      el.numIcon.innerHTML = '';
    }
  }

  function onNumBlur(e) {
    const maxLen = state.network === 'amex' ? 15 : 16;
    if (state.num && state.num.length < maxLen) {
      e.target.className = 'error';
      setHint(document.getElementById('pcNumHint'), 'Incomplete card number', 'error');
    }
  }

  // ── Expiry ─────────────────────────────────────────────────────────────────
  function onExpInput(e) {
    const formatted = formatExpiry(e.target.value);
    e.target.value  = formatted;
    state.exp        = formatted;
    el.dispExp.textContent = formatted || 'MM / YY';

    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 4) {
      const mm    = parseInt(digits.slice(0, 2), 10);
      const yy    = parseInt(digits.slice(2), 10);
      const now   = new Date();
      const nowYY = now.getFullYear() % 100;
      const nowMM = now.getMonth() + 1;
      const valid = mm >= 1 && mm <= 12 && (yy > nowYY || (yy === nowYY && mm >= nowMM));

      if (valid) {
        e.target.className = 'success';
        setHint(document.getElementById('pcExpHint'), '', '');
      } else {
        e.target.className = 'error';
        setHint(document.getElementById('pcExpHint'), 'Card expired', 'error');
      }
    } else {
      e.target.className = '';
      setHint(document.getElementById('pcExpHint'), '', '');
    }
  }

  // ── CVV ───────────────────────────────────────────────────────────────────
  function onCvvInput(e) {
    const maxLen = state.network === 'amex' ? 4 : 3;
    const digits = e.target.value.replace(/\D/g, '').slice(0, maxLen);
    e.target.value = digits;
    state.cvv = digits;

    if (digits.length === maxLen) {
      e.target.className = 'success';
      setHint(document.getElementById('pcCvvHint'), '', '');
    } else {
      e.target.className = '';
    }
  }

  function onCvvBlur(e) {
    const maxLen = state.network === 'amex' ? 4 : 3;
    if (state.cvv && state.cvv.length < maxLen) {
      e.target.className = 'error';
      setHint(document.getElementById('pcCvvHint'), `${maxLen} digits required`, 'error');
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  function onSubmit(e) {
    e.preventDefault();

    const inputIds = [ids.name, ids.num, ids.exp, ids.cvv];
    const allValid = inputIds.every(id => document.getElementById(id)?.className === 'success');

    if (allValid) {
      const payload = {
        name:     state.name,
        number:   state.num,
        expiry:   state.exp,
        cvv:      state.cvv,
        cardType: state.network,
      };

      // Apply success visual
      el.submit.textContent = '✓ Payment accepted!';
      el.submit.classList.add('state-success');
      el.submit.disabled = true;

      // Dispatch custom event so parent code can handle the data
      el.form.dispatchEvent(new CustomEvent('pc:valid', { detail: payload, bubbles: true }));

      // Call onSuccess callback if provided
      if (typeof options.onSuccess === 'function') options.onSuccess(payload);

    } else {
      const errors = inputIds
        .filter(id => document.getElementById(id)?.className !== 'success')
        .map(id => `${id} is incomplete or invalid`);

      // Apply error visual — auto-reset after 2 s
      el.submit.textContent = 'Please fix errors above';
      el.submit.classList.add('state-error');
      setTimeout(() => {
        el.submit.classList.remove('state-error');
        el.submit.innerHTML = `
          <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="4" width="14" height="10" rx="2" stroke="white" stroke-width="1.5"/>
            <path d="M1 7h14" stroke="white" stroke-width="1.5"/>
            <path d="M4 10h3" stroke="white" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          Pay securely`;
        el.submit.disabled = false;
      }, 2000);

      el.form.dispatchEvent(new CustomEvent('pc:invalid', { detail: { errors }, bubbles: true }));
      if (typeof options.onError === 'function') options.onError(errors);
    }
  }

  // ── Attach listeners ──────────────────────────────────────────────────────
  el.name.addEventListener('input', onNameInput);
  el.name.addEventListener('blur',  onNameBlur);
  el.num.addEventListener('input',  onNumInput);
  el.num.addEventListener('blur',   onNumBlur);
  el.exp.addEventListener('input',  onExpInput);
  el.cvv.addEventListener('input',  onCvvInput);
  el.cvv.addEventListener('blur',   onCvvBlur);
  el.form.addEventListener('submit', onSubmit);

  // ── Teardown (for SPA route changes) ─────────────────────────────────────
  function destroy() {
    el.name.removeEventListener('input', onNameInput);
    el.name.removeEventListener('blur',  onNameBlur);
    el.num.removeEventListener('input',  onNumInput);
    el.num.removeEventListener('blur',   onNumBlur);
    el.exp.removeEventListener('input',  onExpInput);
    el.cvv.removeEventListener('input',  onCvvInput);
    el.cvv.removeEventListener('blur',   onCvvBlur);
    el.form.removeEventListener('submit', onSubmit);
  }

  return { destroy };
}

// ── Auto-init when used as a plain <script> tag ───────────────────────────────
if (typeof window !== 'undefined' && typeof module === 'undefined') {
  document.addEventListener('DOMContentLoaded', () => initPaymentCard());
}

// ── ES module export (bundler / React usage) ──────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initPaymentCard, detectNetwork, formatCardNumber, formatExpiry, maskPAN };
}
// ESM
if (typeof exports !== 'undefined') {
  exports.initPaymentCard = initPaymentCard;
}
