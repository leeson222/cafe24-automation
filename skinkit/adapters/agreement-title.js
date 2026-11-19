/* ==========================================================================
   SkinKit · adapters/agreement-title.js   (이름: agreement-title)
   기능: 약관 동의 제목 "이용약관 동의 (필수)"에서 (필수)/(선택)을 떼어
         <em class="required">필수</em> 이용약관 동의 로 바꾼다
   이유: 카페24는 필수/선택 표시를 제목 글자에 붙여 출력해서 색·위치를 따로 꾸밀 수 없다.
         novadeal member.js를 jQuery 없이 옮겼다.
   안전: label 안에 글자만 있을 때만 바꾼다. 체크박스(input)는 label 밖에 있다
         (확인함: member/agreement.html — {$form.agree_*_check} 뒤에 <label for=… class="check">)
         label 안에 다른 요소가 있으면 건드리지 않는다.
   카페24 의존: .agreeArea .title .check, 문구 (필수)/[필수]/(선택)/[선택]
   한계: 한국어 문구에만 동작한다
   ========================================================================== */
(function (window, document) {
    'use strict';

    var SkinKit = window.SkinKit;
    if (!SkinKit || !SkinKit.adapters) return;

    var SELECTOR = '.agreeArea .title .check';
    var PATTERNS = [
        { type: 'required', text: '필수', regex: /\s*[(\[]필수[)\]]\s*/g },
        { type: 'optional', text: '선택', regex: /\s*[(\[]선택[)\]]\s*/g }
    ];

    function format(label) {
        if (label.getAttribute('data-sk-adapted') === 'agreement-title') return;

        // 기능: 글자만 있는 label만 다룬다
        // 이유: 안에 요소가 있으면 지우는 순간 기능을 잃을 수 있다
        if (label.children.length) return;

        var text = label.textContent.trim();
        if (!text) return;

        for (var i = 0; i < PATTERNS.length; i++) {
            var pattern = PATTERNS[i];
            pattern.regex.lastIndex = 0;
            if (!pattern.regex.test(text)) continue;

            var title = text.replace(pattern.regex, ' ').trim();
            var em = document.createElement('em');
            em.className = pattern.type;
            em.textContent = pattern.text;

            label.textContent = '';
            label.appendChild(em);
            label.appendChild(document.createTextNode(' ' + title));
            label.setAttribute('data-sk-adapted', 'agreement-title');
            return;
        }
    }

    SkinKit.adapters.register('agreement-title', {
        match: SELECTOR,
        run: function (root) {
            root.querySelectorAll(SELECTOR).forEach(format);
        }
    });
})(window, document);
