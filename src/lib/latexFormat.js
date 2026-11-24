// Pure LaTeX-to-readable-Unicode math formatter (zero external dependencies)

function readBraceGroup(str, startIdx) {
  if (str[startIdx] !== '{') return null;
  let depth = 0;
  for (let i = startIdx; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') {
      depth--;
      if (depth === 0) {
        return { content: str.slice(startIdx + 1, i), nextIndex: i + 1 };
      }
    }
  }
  return null;
}

const LATEX_SYMBOLS = {
  // Arrows & logic
  '\\implies': '⇒',
  '\\Rightarrow': '⇒',
  '\\iff': '⇔',
  '\\Leftrightarrow': '⇔',
  '\\to': '→',
  '\\rightarrow': '→',
  '\\leftarrow': '←',
  '\\leftrightarrow': '↔',
  '\\mapsto': '↦',
  // Comparisons & relations
  '\\le': '≤',
  '\\leq': '≤',
  '\\ge': '≥',
  '\\geq': '≥',
  '\\ne': '≠',
  '\\neq': '≠',
  '\\approx': '≈',
  '\\equiv': '≡',
  '\\sim': '~',
  '\\propto': '∝',
  // Arithmetic & operators
  '\\times': '×',
  '\\cdot': '·',
  '\\pm': '±',
  '\\mp': '∓',
  '\\div': '÷',
  '\\infty': '∞',
  '\\partial': '∂',
  '\\nabla': '∇',
  '\\sum': '∑',
  '\\prod': '∏',
  '\\int': '∫',
  '\\oint': '∮',
  // Set theory & quantifiers
  '\\in': '∈',
  '\\notin': '∉',
  '\\subset': '⊂',
  '\\subseteq': '⊆',
  '\\supset': '⊃',
  '\\supseteq': '⊇',
  '\\cup': '∪',
  '\\cap': '∩',
  '\\emptyset': '∅',
  '\\varnothing': '∅',
  '\\forall': '∀',
  '\\exists': '∃',
  '\\land': '∧',
  '\\lor': '∨',
  '\\neg': '¬',
  '\\oplus': '⊕',
  // Floor / ceiling / brackets
  '\\lfloor': '⌊',
  '\\rfloor': '⌋',
  '\\lceil': '⌈',
  '\\rceil': '⌉',
  '\\langle': '⟨',
  '\\rangle': '⟩',
  '\\dots': '…',
  '\\ldots': '…',
  '\\cdots': '⋯',
  // Greek letters
  '\\alpha': 'α',
  '\\beta': 'β',
  '\\gamma': 'γ',
  '\\Gamma': 'Γ',
  '\\delta': 'δ',
  '\\Delta': 'Δ',
  '\\epsilon': 'ε',
  '\\varepsilon': 'ε',
  '\\zeta': 'ζ',
  '\\eta': 'η',
  '\\theta': 'θ',
  '\\Theta': 'Θ',
  '\\lambda': 'λ',
  '\\Lambda': 'Λ',
  '\\mu': 'μ',
  '\\nu': 'ν',
  '\\xi': 'ξ',
  '\\pi': 'π',
  '\\Pi': 'Π',
  '\\rho': 'ρ',
  '\\sigma': 'σ',
  '\\Sigma': 'Σ',
  '\\tau': 'τ',
  '\\phi': 'φ',
  '\\varphi': 'φ',
  '\\Phi': 'Φ',
  '\\chi': 'χ',
  '\\psi': 'ψ',
  '\\Psi': 'Ψ',
  '\\omega': 'ω',
  '\\Omega': 'Ω',
  // Common math words
  '\\log': 'log',
  '\\ln': 'ln',
  '\\lg': 'lg',
  '\\exp': 'exp',
  '\\lim': 'lim',
  '\\sin': 'sin',
  '\\cos': 'cos',
  '\\tan': 'tan',
  '\\sec': 'sec',
  '\\csc': 'csc',
  '\\cot': 'cot',
  '\\min': 'min',
  '\\max': 'max',
  '\\det': 'det',
  '\\gcd': 'gcd',
  '\\mod': 'mod',
  '\\bmod': 'mod',
  '\\pmod': 'mod',
  '\\deg': 'deg',
  '\\arg': 'arg',
};

const SUPERSCRIPT_MAP = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾',
  'n': 'ⁿ',
  'i': 'ⁱ',
  'k': 'ᵏ',
  'x': 'ˣ',
  'T': 'ᵀ',
};

const SUBSCRIPT_MAP = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
  'a': 'ₐ',
  'e': 'ₑ',
  'i': 'ᵢ',
  'j': 'ⱼ',
  'k': 'ₖ',
  'm': 'ₘ',
  'n': 'ₙ',
  'o': 'ₒ',
  'p': 'ₚ',
  'r': 'ᵣ',
  's': 'ₛ',
  't': 'ₜ',
  'u': 'ᵤ',
  'v': 'ᵥ',
  'x': 'ₓ',
};

function toUnicodeScript(str, map) {
  let out = '';
  for (const ch of str) {
    if (!map[ch]) return null;
    out += map[ch];
  }
  return out;
}

export function formatLatexToReadable(raw) {
  if (!raw) return '';
  let s = String(raw).trim();

  // Normalize accidental double-escaped LaTeX commands from JSON responses (\\frac -> \frac)
  s = s.replace(/\\\\(?=[a-zA-Z])/g, '\\');
  // Remove \left and \right sizing directives
  s = s.replace(/\\(?:left|right|big|Big|bigg|Bigg)\b/g, '');
  // Convert spacing commands (\, \; \: \! \quad \qquad \ ) to space
  s = s.replace(/\\(?:qquad|quad|,|;|:|!|\s)/g, ' ');
  // Escaped literal braces/percents/underscores
  s = s.replace(/\\([{}%&$#_])/g, '$1');

  // Unwrap wrapper commands like \text{...}, \mathrm{...}, \mathbf{...}, \mathbb{...}, \mathcal{...}
  const unwrapCmd =
    /\\(?:text|textrm|textbf|textit|mathrm|mathbf|mathit|mathbb|mathcal|mathsf|mathtt|operatorname|hat|bar|vec|tilde|overline|underline)\s*\{/;
  let guard = 0;
  while (guard < 25) {
    const m = unwrapCmd.exec(s);
    if (!m) break;
    guard++;
    const braceStart = m.index + m[0].length - 1;
    const grp = readBraceGroup(s, braceStart);
    if (!grp) break;
    s = s.slice(0, m.index) + grp.content + s.slice(grp.nextIndex);
  }

  // Convert \frac{a}{b} -> a/b or (a)/(b)
  guard = 0;
  while (s.includes('\\frac') && guard < 20) {
    guard++;
    const idx = s.indexOf('\\frac');
    let cursor = idx + 5;
    while (s[cursor] === ' ') cursor++;
    const num = readBraceGroup(s, cursor);
    if (!num) break;
    let cursor2 = num.nextIndex;
    while (s[cursor2] === ' ') cursor2++;
    const den = readBraceGroup(s, cursor2);
    if (!den) break;
    const nClean = formatLatexToReadable(num.content);
    const dClean = formatLatexToReadable(den.content);
    const nWrapped =
      /[+\-\s]/.test(nClean) && !(nClean.startsWith('(') && nClean.endsWith(')'))
        ? `(${nClean})`
        : nClean;
    const dWrapped =
      /[+\-\s]/.test(dClean) && !(dClean.startsWith('(') && dClean.endsWith(')'))
        ? `(${dClean})`
        : dClean;
    s = s.slice(0, idx) + `${nWrapped}/${dWrapped}` + s.slice(den.nextIndex);
  }

  // Convert \binom{n}{k} -> C(n, k)
  guard = 0;
  while (s.includes('\\binom') && guard < 15) {
    guard++;
    const idx = s.indexOf('\\binom');
    let cursor = idx + 6;
    while (s[cursor] === ' ') cursor++;
    const top = readBraceGroup(s, cursor);
    if (!top) break;
    let cursor2 = top.nextIndex;
    while (s[cursor2] === ' ') cursor2++;
    const bot = readBraceGroup(s, cursor2);
    if (!bot) break;
    s =
      s.slice(0, idx) +
      `C(${formatLatexToReadable(top.content)}, ${formatLatexToReadable(bot.content)})` +
      s.slice(bot.nextIndex);
  }

  // Convert \sqrt[n]{x} or \sqrt{x} -> √(x)
  guard = 0;
  while (s.includes('\\sqrt') && guard < 15) {
    guard++;
    const idx = s.indexOf('\\sqrt');
    let cursor = idx + 5;
    while (s[cursor] === ' ') cursor++;
    let rootPrefix = '√';
    if (s[cursor] === '[') {
      const closeBracket = s.indexOf(']', cursor);
      if (closeBracket !== -1) {
        const rootDeg = s.slice(cursor + 1, closeBracket).trim();
        rootPrefix =
          rootDeg === '3' ? '∛' : `${toUnicodeScript(rootDeg, SUPERSCRIPT_MAP) || rootDeg}√`;
        cursor = closeBracket + 1;
        while (s[cursor] === ' ') cursor++;
      }
    }
    const arg = readBraceGroup(s, cursor);
    if (!arg) break;
    const inner = formatLatexToReadable(arg.content);
    const formatted = inner.length === 1 ? `${rootPrefix}${inner}` : `${rootPrefix}(${inner})`;
    s = s.slice(0, idx) + formatted + s.slice(arg.nextIndex);
  }

  // Replace known LaTeX symbol commands
  s = s.replace(/\\[a-zA-Z]+/g, (cmd) => {
    if (Object.prototype.hasOwnProperty.call(LATEX_SYMBOLS, cmd)) {
      return LATEX_SYMBOLS[cmd];
    }
    return cmd.slice(1);
  });

  // Convert superscripts ^{...} or ^x
  guard = 0;
  while (s.includes('^') && guard < 30) {
    guard++;
    const idx = s.indexOf('^');
    if (idx === -1 || idx === s.length - 1) break;
    if (s[idx + 1] === '{') {
      const grp = readBraceGroup(s, idx + 1);
      if (!grp) break;
      const inner = formatLatexToReadable(grp.content);
      const uni = toUnicodeScript(inner, SUPERSCRIPT_MAP);
      const rep = uni || (inner.length === 1 ? `\uE000${inner}` : `\uE000(${inner})`);
      s = s.slice(0, idx) + rep + s.slice(grp.nextIndex);
    } else {
      const ch = s[idx + 1];
      const uni = SUPERSCRIPT_MAP[ch];
      s = s.slice(0, idx) + (uni || `\uE000${ch}`) + s.slice(idx + 2);
    }
  }
  s = s.replace(/\uE000/g, '^');

  // Convert subscripts _{...} or _x
  guard = 0;
  while (s.includes('_') && guard < 30) {
    guard++;
    const idx = s.indexOf('_');
    if (idx === -1 || idx === s.length - 1) break;
    if (s[idx + 1] === '{') {
      const grp = readBraceGroup(s, idx + 1);
      if (!grp) break;
      const inner = formatLatexToReadable(grp.content);
      const uni = toUnicodeScript(inner, SUBSCRIPT_MAP);
      const rep = uni || `(${inner})`;
      s = s.slice(0, idx) + (uni ? rep : ` ${rep}`) + s.slice(grp.nextIndex);
    } else {
      const ch = s[idx + 1];
      const uni = SUBSCRIPT_MAP[ch];
      s = s.slice(0, idx) + (uni || `\uE001${ch}`) + s.slice(idx + 2);
    }
  }
  s = s.replace(/\uE001/g, '_');

  return s.replace(/[{}]/g, '').replace(/\s{2,}/g, ' ').trim();
}
