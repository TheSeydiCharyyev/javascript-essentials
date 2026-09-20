/**
 * Tiny syntax highlighter for the course pages: <pre class="code js"> and <pre class="code html">.
 * Reads the text of the block and wraps tokens in <span class="tok-...">; the text itself never changes.
 */
(function () {
  var KEYWORDS = /^(await|async|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|let|new|of|return|static|super|switch|this|throw|try|typeof|var|void|while|with|yield)$/;
  var VALUES = /^(true|false|null|undefined|NaN|Infinity)$/;

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function span(cls, text) {
    return '<span class="tok-' + cls + '">' + esc(text) + '</span>';
  }

  function js(code) {
    var out = '', i = 0;
    while (i < code.length) {
      var rest = code.slice(i), m;
      if ((m = /^\/\/[^\n]*/.exec(rest)) || (m = /^\/\*[\s\S]*?\*\//.exec(rest))) { out += span('com', m[0]); i += m[0].length; continue; }
      if ((m = /^"(?:\\.|[^"\\])*"/.exec(rest)) || (m = /^'(?:\\.|[^'\\])*'/.exec(rest)) || (m = /^`(?:\\.|[^`\\])*`/.exec(rest))) {
        out += span('str', m[0]); i += m[0].length; continue;
      }
      if ((m = /^\d+(?:\.\d+)?(?:e[+-]?\d+)?n?/i.exec(rest))) { out += span('num', m[0]); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_$][\w$]*/.exec(rest))) {
        var word = m[0], after = rest.slice(word.length), before = code.slice(0, i);
        var cls = KEYWORDS.test(word) ? 'key'
          : VALUES.test(word) ? 'val'
          : /^\s*\(/.test(after) ? 'fn'
          : /\.\s*$/.test(before) ? 'prop'
          : /^[A-Z]/.test(word) ? 'cls' : 'id';
        out += span(cls, word); i += word.length; continue;
      }
      if ((m = /^[{}()[\];,.]+/.exec(rest))) { out += span('punc', m[0]); i += m[0].length; continue; }
      if ((m = /^[=+\-*/%<>!?&|:^~]+/.exec(rest))) { out += span('op', m[0]); i += m[0].length; continue; }
      out += esc(code[i]); i++;
    }
    return out;
  }

  function html(code) {
    var out = '', i = 0;
    while (i < code.length) {
      var rest = code.slice(i), m;
      if ((m = /^<!--[\s\S]*?-->/.exec(rest))) { out += span('com', m[0]); i += m[0].length; continue; }
      if ((m = /^<\/?[A-Za-z][\w-]*/.exec(rest))) { out += span('tag', m[0]); i += m[0].length; continue; }
      if ((m = /^\s+[A-Za-z-]+(?==)/.exec(rest))) { out += span('attr', m[0]); i += m[0].length; continue; }
      if ((m = /^"(?:[^"]*)"/.exec(rest)) || (m = /^'(?:[^']*)'/.exec(rest))) { out += span('str', m[0]); i += m[0].length; continue; }
      if ((m = /^\/?>/.exec(rest))) { out += span('tag', m[0]); i += m[0].length; continue; }
      out += esc(code[i]); i++;
    }
    return out;
  }

  window.highlightCode = function (code, lang) {
    return lang === 'html' ? html(code) : js(code);
  };

  function run() {
    document.querySelectorAll('pre.code').forEach(function (pre) {
      if (pre.dataset.highlighted) return;
      var lang = pre.classList.contains('html') ? 'html' : 'js';
      pre.innerHTML = window.highlightCode(pre.textContent, lang);
      pre.dataset.highlighted = '1';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
