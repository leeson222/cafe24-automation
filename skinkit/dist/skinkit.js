/*! SkinKit Adapters — 자동 생성 파일. 직접 고치지 말고 skinkit/ 원본을 고친 뒤 다시 빌드한다
 *  breakpoint: layout 1024px / small 767px */

/* ===== adapters/core.js ===== */
/* ==========================================================================
   SkinKit · adapters/core.js
   기능: Style Adapter 등록·실행 관리
         - 켜기: <html data-sk-adapters="address-form agreement-title"> 또는
                 window.SkinKitConfig = { adapters: ['custom-select'] } (core.js보다 먼저 선언)
         - 실행: DOM 준비 후 한 번, 이후 카페24가 요소를 다시 그리면 해당 adapter만 다시 실행
   이유: novadeal은 기능마다 MutationObserver를 따로 달아 71개(그중 body 전체 감시 42개)였다.
         감시 장치를 하나만 두고, 새로 생긴 노드가 adapter의 대상일 때만 실행한다.
   규칙 (모든 adapter가 지킨다)
     1. 대상이 없으면 아무것도 하지 않는다
     2. 여러 번 실행해도 결과가 같다 (data-sk-adapted 표시로 중복 래퍼를 막는다)
     3. 노드를 복사(.innerHTML)하지 않고 옮긴다. 이벤트·form 소속·name/id/value를 유지한다
     4. 주문서·결제 영역은 건드리지 않는다
   의존: 없음 (jQuery를 쓰지 않는다. 카페24 jQuery 버전·로드 순서와 무관하게 동작하게 하기 위해서다)
   ========================================================================== */
(function (window, document) {
    'use strict';

    var SkinKit = window.SkinKit = window.SkinKit || {};

    // 기능: core.js가 두 번 불려도 한 번만 초기화한다
    // 이유: layout.html과 popup.html 양쪽에서 불러오거나 @js가 중복 선언될 수 있다
    if (SkinKit.adapters) return;

    var registry = {};       // 이름 → { match, run }
    var order = [];          // 등록 순서 (실행 순서)
    var enabledList = readEnabled();
    var isReady = false;
    var observer = null;

    // ----------------------------------------------------------------
    // 기능: 켜진 adapter 목록을 읽는다 (html 속성 + 전역 설정을 합친다)
    // 이유: 기본값은 모두 꺼짐이다. 쇼핑몰이 필요한 것만 명시해서 켠다
    // ----------------------------------------------------------------
    function readEnabled() {
        var list = [];
        var attr = document.documentElement.getAttribute('data-sk-adapters') || '';
        attr.split(/[\s,]+/).forEach(function (name) {
            if (name) list.push(name);
        });
        var config = window.SkinKitConfig || {};
        if (Array.isArray(config.adapters)) {
            config.adapters.forEach(function (name) {
                if (list.indexOf(name) < 0) list.push(name);
            });
        }
        return list;
    }

    function isEnabled(name) {
        return enabledList.indexOf(name) > -1;
    }

    // ----------------------------------------------------------------
    // 기능: adapter 하나를 실행한다
    // 이유: 한 adapter의 오류가 다른 adapter와 카페24 스크립트를 멈추지 않게 try로 감싼다
    // ----------------------------------------------------------------
    function runOne(name) {
        try {
            registry[name].run(document);
        } catch (error) {
            if (window.console) window.console.warn('[SkinKit] adapter "' + name + '" 실행 실패', error);
        }
    }

    // 기능: adapter 실행으로 생긴 DOM 변경 기록을 버린다
    // 이유: 우리가 만든 래퍼 때문에 감시가 다시 실행되는 반복을 막는다
    function discardOwnMutations() {
        if (observer) observer.takeRecords();
    }

    function runAll() {
        order.forEach(function (name) {
            if (isEnabled(name)) runOne(name);
        });
        discardOwnMutations();
    }

    // ----------------------------------------------------------------
    // 기능: 카페24가 다시 그린 노드 중 adapter 대상이 있으면 그 adapter만 바로 실행
    // 이유: 속성 변경은 보지 않고 추가된 노드만 본다.
    //       MutationObserver는 한 작업(task)의 DOM 변경을 모아서 한 번에 알려 주므로
    //       카페24가 레이어를 다 그린 뒤에 실행된다. requestAnimationFrame으로 미루면
    //       백그라운드 탭에서 멈춰 adapter가 적용되지 않는 일이 생겨서 쓰지 않는다 (demo 검사로 확인)
    // ----------------------------------------------------------------
    function onMutations(records) {
        var pending = {};
        records.forEach(function (record) {
            for (var i = 0; i < record.addedNodes.length; i++) {
                var node = record.addedNodes[i];
                if (node.nodeType !== 1) continue;
                order.forEach(function (name) {
                    if (!isEnabled(name) || pending[name]) return;
                    var match = registry[name].match;
                    if (node.matches(match) || node.querySelector(match)) pending[name] = true;
                });
            }
        });
        var names = Object.keys(pending);
        if (!names.length) return;
        names.forEach(runOne);
        discardOwnMutations();
    }

    function startObserver() {
        if (observer || !document.body || !enabledList.length) return;
        observer = new MutationObserver(onMutations);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function onReady() {
        isReady = true;
        runAll();
        startObserver();
    }

    // ----------------------------------------------------------------
    // 공개 API
    // ----------------------------------------------------------------
    SkinKit.adapters = {
        /**
         * 기능: adapter 등록
         * @param {string} name   켜기 목록에 쓰는 이름
         * @param {{match: string, run: function(Document)}} def
         *        match: 다시 실행할지 판단할 CSS 선택자 (새로 생긴 노드가 이것이거나 포함하면 실행)
         *        run:   실제 작업. 여러 번 불려도 결과가 같아야 한다
         */
        register: function (name, def) {
            if (registry[name]) return;
            registry[name] = def;
            order.push(name);
            // 이유: DOM 준비 후에 늦게 불러온 adapter도 바로 적용되게 한다
            if (isReady && isEnabled(name)) {
                runOne(name);
                discardOwnMutations();
                startObserver();
            }
        },

        // 기능: 쇼핑몰 JS가 DOM을 직접 바꾼 뒤 adapter를 다시 적용할 때 쓴다
        refresh: function (name) {
            if (name) {
                if (registry[name] && isEnabled(name)) runOne(name);
                discardOwnMutations();
            } else {
                runAll();
            }
        },

        isEnabled: isEnabled
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        onReady();
    }
})(window, document);

/* ===== adapters/address-form.js ===== */
/* ==========================================================================
   SkinKit · adapters/address-form.js   (이름: address-form)
   기능: 회원가입·정보수정의 우편번호 입력칸(#postcode1)과 검색 버튼(#postBtn)을
         <span class="addr-search-wrap">으로 묶는다
   이유: 카페24 마크업에서 두 요소가 다른 형제들과 섞여 있어 한 줄 배치(flex)를 줄 수 없다.
         novadeal member.js의 wrapAll을 jQuery 없이 옮겼다.
   안전: 두 요소를 복사하지 않고 옮기므로 id, name, value, onclick이 그대로다.
   카페24 의존: #join_zipcode_wrap(회원가입), #fmodify_zipcode_wrap(정보수정) 안의 #postcode1, #postBtn
   [확인 필요] 마이쇼핑 배송지 등록 팝업 등 다른 화면의 우편번호 영역 id
   설정: window.SkinKitConfig.addressForm = { containers: ['#join_zipcode_wrap', …] }
   ========================================================================== */
(function (window, document) {
    'use strict';

    var SkinKit = window.SkinKit;
    if (!SkinKit || !SkinKit.adapters) return;

    var config = (window.SkinKitConfig || {}).addressForm || {};
    var containers = config.containers || ['#join_zipcode_wrap', '#fmodify_zipcode_wrap'];

    function wrap(container) {
        var input = container.querySelector('#postcode1');
        var button = container.querySelector('#postBtn');

        // 기능: 대상이 없거나 이미 묶였으면 그만둔다
        if (!input || !button) return;
        if (input.parentNode.classList.contains('addr-search-wrap')) return;

        // 기능: 둘이 같은 부모 아래 있을 때만 묶는다
        // 이유: 부모가 다르면 묶을 때 카페24 마크업 구조가 크게 바뀐다
        if (input.parentNode !== button.parentNode) return;

        var wrapper = document.createElement('span');
        wrapper.className = 'addr-search-wrap';
        wrapper.setAttribute('data-sk-adapted', 'address-form');

        // 기능: 앞에 있는 요소 자리에 래퍼를 넣고, 원래 순서대로 옮긴다
        var inputFirst = input.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING;
        var first = inputFirst ? input : button;
        var second = inputFirst ? button : input;
        first.parentNode.insertBefore(wrapper, first);
        wrapper.appendChild(first);
        wrapper.appendChild(second);
    }

    SkinKit.adapters.register('address-form', {
        match: '#postcode1',
        run: function (root) {
            containers.forEach(function (selector) {
                root.querySelectorAll(selector).forEach(wrap);
            });
        }
    });
})(window, document);

/* ===== adapters/agreement-title.js ===== */
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

/* ===== adapters/custom-select.js ===== */
/* ==========================================================================
   SkinKit · adapters/custom-select.js   (이름: custom-select, 선택형)
   기능: 원본 <select>를 화면에서 숨기고 ul/li 커스텀 select(components/select.css)를 바로 뒤에 만든다.
         원본 select는 그대로 남아 값 전송·카페24 이벤트를 담당한다 (프록시 방식).
   이유: 원본 select는 브라우저마다 목록 모양이 달라 시안대로 꾸밀 수 없다.
         novadeal dropdown.js(전체 select)와 basket.js(옵션 변경 레이어)에 따로 있던 코드를 합쳤다.

   novadeal에서 고친 점
     1. 적용 범위: 모든 select → 설정한 대상만. 주문서·결제는 항상 제외
     2. 동기화: 커스텀 → 원본 한 방향 → 양방향
        - 원본 change(네이티브 + 카페24 jQuery .trigger('change'))를 듣는다
          이유: jQuery .trigger('change')는 addEventListener 리스너를 부르지 않는다
        - 옵션이 다시 그려지면(core 감시) 목록을 다시 만든다
        - 열 때마다 원본 값을 다시 읽는다 (JS가 .val()만 바꾸고 change를 안 보낸 경우 대비)
     3. 늦게 생기는 select(레이어 등)도 처리한다 (core 감시)
     4. 키보드·스크린리더: button + listbox/option 역할, ↑↓ Home End Enter Space Esc Tab
     5. 상태 클래스: .is-open 하나로 통일 (basket.js는 .active)
     6. 화살표: 쇼핑몰 CDN 이미지 → CSS

   설정: window.SkinKitConfig.customSelect = {
           target:  '…',   // 적용할 select 선택자 (기본: 본문·팝업·레이어의 select)
           exclude: ['…']  // 추가로 뺄 선택자 (기본 제외 목록에 더해진다)
         }
         특정 select만 빼려면 <select data-sk-native> 를 붙인다
   ========================================================================== */
(function (window, document) {
    'use strict';

    var SkinKit = window.SkinKit;
    if (!SkinKit || !SkinKit.adapters) return;

    var config = (window.SkinKitConfig || {}).customSelect || {};

    var TARGET = config.target || '#contents select, #popup select, .ec-base-layer select';

    // 기능: 항상 빼는 영역
    // 이유: 주문서·결제(절대 규칙 7)는 설정으로도 켤 수 없게 한다
    var ALWAYS_EXCLUDE = '.xans-order-form select, #mCafe24Order select';

    // 기능: 기본으로 빼는 대상 (설정 exclude가 여기에 더해진다)
    // 이유: 상품 옵션 select는 카페24 가격 계산·재고 확인이 연결되어 있다 (절대 규칙 6).
    //       multiple/size는 목록형 select라 드롭다운으로 바꾸면 안 된다
    var DEFAULT_EXCLUDE = [
        '[data-sk-native]',
        '[multiple]',
        '[size]:not([size="1"])',
        '.xans-product-option select',
        'select[product_option_area_select]',
        'select[option_select_element]'
    ];
    var EXCLUDE = DEFAULT_EXCLUDE.concat(config.exclude || []).join(', ');

    var uid = 0;
    var instances = [];          // { select, root, button, text, list }
    var documentBound = false;

    // ----------------------------------------------------------------
    // 대상 판별
    // ----------------------------------------------------------------
    function isTarget(select) {
        if (select.closest('.xans-order-form, #mCafe24Order')) return false;
        if (select.matches(ALWAYS_EXCLUDE)) return false;
        if (select.matches(EXCLUDE)) return false;
        return true;
    }

    function findInstance(select) {
        for (var i = 0; i < instances.length; i++) {
            if (instances[i].select === select) return instances[i];
        }
        return null;
    }

    // ----------------------------------------------------------------
    // 기능: select에 연결된 label을 찾는다 (스크린리더가 "무엇을 고르는지" 읽게)
    // ----------------------------------------------------------------
    function findLabel(select) {
        if (select.id) {
            var label = document.querySelector('label[for="' + window.CSS.escape(select.id) + '"]');
            if (label) return label;
        }
        return select.closest('label');
    }

    // ----------------------------------------------------------------
    // 기능: 커스텀 마크업을 만든다
    // 이유: 글자는 textContent로만 넣는다 (상품명 등에 들어 있는 HTML이 실행되지 않게)
    // ----------------------------------------------------------------
    function build(select) {
        var id = 'sk-cselect-' + (++uid);

        var root = document.createElement('ul');
        root.className = 'custom-select';
        root.setAttribute('role', 'presentation');
        root.setAttribute('data-sk-adapted', 'custom-select');

        var current = document.createElement('li');
        current.className = 'custom-select-current';
        current.setAttribute('role', 'presentation');

        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'custom-select-default';
        button.setAttribute('aria-haspopup', 'listbox');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', id + '-list');

        var text = document.createElement('span');
        text.className = 'custom-select-text';
        text.id = id + '-text';

        var icon = document.createElement('i');
        icon.setAttribute('aria-hidden', 'true');

        var list = document.createElement('ul');
        list.className = 'custom-select-options';
        list.id = id + '-list';
        list.setAttribute('role', 'listbox');
        list.setAttribute('tabindex', '-1');

        // 기능: 버튼 이름 = label 글자 + 현재 선택값
        // 이유: label에 id가 없으면 붙인다. label은 폼 값이 아니라 안전하다
        var label = findLabel(select);
        var labelledBy = text.id;
        if (label) {
            if (!label.id) label.id = id + '-label';
            labelledBy = label.id + ' ' + text.id;
            list.setAttribute('aria-labelledby', label.id);
        }
        button.setAttribute('aria-labelledby', labelledBy);

        button.appendChild(text);
        button.appendChild(icon);
        current.appendChild(button);
        current.appendChild(list);
        root.appendChild(current);
        select.parentNode.insertBefore(root, select.nextSibling);

        // 기능: 원본 select를 화면에서만 숨긴다
        // 이유: display:none이면 일부 브라우저가 필수 입력 검사에서 오류를 낸다.
        //       Tab 순서와 스크린리더에서는 빼서 같은 항목이 두 번 읽히지 않게 한다
        select.classList.add('sk-visually-hidden');
        select.setAttribute('tabindex', '-1');
        select.setAttribute('aria-hidden', 'true');
        select.setAttribute('data-sk-adapted', 'custom-select');

        var instance = { select: select, root: root, button: button, text: text, list: list, signature: '', activeIndex: -1 };
        instances.push(instance);

        bindInstance(instance);
        renderOptions(instance);
        syncSelected(instance);
        return instance;
    }

    // ----------------------------------------------------------------
    // 기능: 원본 option으로 목록을 다시 만든다 (옵션이 바뀐 경우에만)
    // 이유: 카페24가 지역·옵션 select를 다시 그리면 option이 바뀐다
    // ----------------------------------------------------------------
    function optionSignature(select) {
        var parts = [];
        for (var i = 0; i < select.options.length; i++) {
            var option = select.options[i];
            parts.push(option.value + '\u0001' + option.text + '\u0001' + (option.disabled ? 1 : 0) + (option.hidden ? 1 : 0));
        }
        return parts.join('\u0002');
    }

    function renderOptions(instance) {
        var select = instance.select;
        var signature = optionSignature(select);
        if (signature === instance.signature) return;
        instance.signature = signature;

        var list = instance.list;
        list.textContent = '';
        for (var i = 0; i < select.options.length; i++) {
            var option = select.options[i];
            if (option.hidden) continue;
            var item = document.createElement('li');
            item.className = 'custom-select-option';
            item.id = list.id + '-' + i;
            item.setAttribute('role', 'option');
            item.setAttribute('data-value', option.value);
            item.setAttribute('data-index', String(i));
            item.textContent = option.text;
            if (option.disabled) {
                item.classList.add('disabled');
                item.setAttribute('aria-disabled', 'true');
            }
            list.appendChild(item);
        }
    }

    // 기능: 원본의 선택값·비활성 상태를 화면에 반영
    function syncSelected(instance) {
        var select = instance.select;
        renderOptions(instance);

        var index = select.selectedIndex;
        var option = index > -1 ? select.options[index] : null;
        instance.text.textContent = option ? option.text : '';
        instance.root.querySelector('.custom-select-current').setAttribute('data-value', option ? option.value : '');

        var items = instance.list.children;
        for (var i = 0; i < items.length; i++) {
            var selected = Number(items[i].getAttribute('data-index')) === index;
            items[i].classList.toggle('selected', selected);
            items[i].setAttribute('aria-selected', selected ? 'true' : 'false');
        }

        instance.root.classList.toggle('is-disabled', select.disabled);
        instance.button.disabled = select.disabled;
    }

    // ----------------------------------------------------------------
    // 열기 / 닫기
    // ----------------------------------------------------------------
    function open(instance) {
        if (instance.select.disabled) return;
        closeAll(instance);
        syncSelected(instance);
        instance.root.classList.add('is-open');
        instance.button.setAttribute('aria-expanded', 'true');
        setActive(instance, selectableIndexOf(instance, instance.select.selectedIndex));
        instance.list.focus();
    }

    function close(instance, focusButton) {
        if (!instance.root.classList.contains('is-open')) return;
        instance.root.classList.remove('is-open');
        instance.button.setAttribute('aria-expanded', 'false');
        instance.list.removeAttribute('aria-activedescendant');
        setActive(instance, -1);
        if (focusButton) instance.button.focus();
    }

    function closeAll(except) {
        instances.forEach(function (instance) {
            if (instance !== except) close(instance, false);
        });
    }

    // ----------------------------------------------------------------
    // 키보드 이동용 "현재 가리키는 항목"
    // ----------------------------------------------------------------
    function items(instance) {
        return Array.prototype.slice.call(instance.list.children);
    }

    function selectableIndexOf(instance, optionIndex) {
        var list = items(instance);
        for (var i = 0; i < list.length; i++) {
            if (Number(list[i].getAttribute('data-index')) === optionIndex) return i;
        }
        return list.length ? 0 : -1;
    }

    function setActive(instance, position) {
        var list = items(instance);
        list.forEach(function (item) { item.classList.remove('is-focused'); });
        instance.activeIndex = position;
        if (position < 0 || !list[position]) return;
        list[position].classList.add('is-focused');
        instance.list.setAttribute('aria-activedescendant', list[position].id);
        list[position].scrollIntoView({ block: 'nearest' });
    }

    function moveActive(instance, step) {
        var list = items(instance);
        var position = instance.activeIndex;
        for (var n = 0; n < list.length; n++) {
            position = Math.min(list.length - 1, Math.max(0, position + step));
            if (!list[position].classList.contains('disabled')) break;
        }
        setActive(instance, position);
    }

    // ----------------------------------------------------------------
    // 기능: 값을 고른다 → 원본 select에 반영하고 change를 보낸다
    // 이유: 카페24가 원본 select에 건 onchange·jQuery 이벤트가 그대로 실행되게 한다.
    //       네이티브 이벤트는 jQuery .on('change') 핸들러와 inline onchange 모두를 실행한다
    // ----------------------------------------------------------------
    function choose(instance, item) {
        if (!item || item.classList.contains('disabled')) return;
        var select = instance.select;
        var index = Number(item.getAttribute('data-index'));
        if (select.selectedIndex !== index) {
            select.selectedIndex = index;
            select.dispatchEvent(new Event('input', { bubbles: true }));
            select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        syncSelected(instance);
        close(instance, true);
    }

    // ----------------------------------------------------------------
    // 이벤트 연결
    // ----------------------------------------------------------------
    function bindInstance(instance) {
        var select = instance.select;

        instance.button.addEventListener('click', function () {
            if (instance.root.classList.contains('is-open')) close(instance, true);
            else open(instance);
        });

        instance.button.addEventListener('keydown', function (event) {
            if (['ArrowDown', 'ArrowUp', 'Enter', ' '].indexOf(event.key) > -1) {
                event.preventDefault();
                open(instance);
            }
        });

        instance.list.addEventListener('click', function (event) {
            choose(instance, event.target.closest('.custom-select-option'));
        });

        instance.list.addEventListener('keydown', function (event) {
            var list = items(instance);
            switch (event.key) {
                case 'ArrowDown': event.preventDefault(); moveActive(instance, 1); break;
                case 'ArrowUp': event.preventDefault(); moveActive(instance, -1); break;
                case 'Home': event.preventDefault(); setActive(instance, -1); moveActive(instance, 1); break;
                case 'End': event.preventDefault(); setActive(instance, list.length); moveActive(instance, -1); break;
                case 'Enter':
                case ' ':
                    event.preventDefault();
                    choose(instance, list[instance.activeIndex]);
                    break;
                case 'Escape': event.preventDefault(); close(instance, true); break;
                case 'Tab': close(instance, false); break;
            }
        });

        // 기능: 원본 값이 바뀌면 화면을 맞춘다
        select.addEventListener('change', function () { syncSelected(instance); });
        // 이유: 카페24 jQuery의 .trigger('change')는 위 리스너를 부르지 않는다.
        //       같은 jQuery 인스턴스(window.jQuery = 카페24 것)로도 듣는다
        if (window.jQuery) {
            window.jQuery(select).on('change.skCustomSelect', function () { syncSelected(instance); });
        }
    }

    // 기능: 바깥을 누르면 닫는다 (문서에 한 번만 연결)
    function bindDocument() {
        if (documentBound) return;
        documentBound = true;
        document.addEventListener('click', function (event) {
            instances.forEach(function (instance) {
                if (!instance.root.contains(event.target)) close(instance, false);
            });
        });
    }

    // ----------------------------------------------------------------
    // 기능: 문서에서 사라진 인스턴스를 정리한다
    // 이유: 카페24가 레이어를 지우면 select도 사라진다. 참조를 남기면 메모리가 샌다
    // ----------------------------------------------------------------
    function cleanup() {
        instances = instances.filter(function (instance) {
            if (instance.select.isConnected) return true;
            if (instance.root.isConnected) instance.root.remove();
            return false;
        });
    }

    SkinKit.adapters.register('custom-select', {
        match: 'select, option',
        run: function (root) {
            cleanup();
            bindDocument();
            root.querySelectorAll(TARGET).forEach(function (select) {
                if (!isTarget(select)) return;
                var instance = findInstance(select);
                // 이유: 이미 만든 select는 옵션·값만 다시 맞춘다 (중복 생성 방지)
                if (instance) syncSelected(instance);
                else build(select);
            });
        }
    });
})(window, document);

/* ===== adapters/address-book.js ===== */
/* ==========================================================================
   SkinKit · adapters/address-book.js   (이름: address-book, 선택형)
   기능: 마이쇼핑 배송 주소록 표의 칸마다 이름(class)과 항목명(data-label)을 붙이고,
         칸 안쪽을 <div class="addr-value">로 감싼다. 배치는 cafe24/myshop.css가 한다.
   이유: novadeal myshop.js는 화면 폭이 바뀔 때마다 is-mobile을 넣고 빼며 수정 버튼을 옮겼다가
         되돌렸다(resize + body 감시). 표시만 한 번 하고 배치는 CSS grid로 바꾸면
         화면 폭이 바뀌어도 DOM을 다시 건드릴 필요가 없다.
   안전: 칸 안 노드를 복사하지 않고 옮긴다 (체크박스 name/value, 버튼 onclick 유지)
   카페24 의존: .xans-myshop-addrlist 표, tbody tr.xans-record-, 칸 8개 순서
                [선택, 고정, 배송지명, 수령인, 일반전화, 휴대전화, 주소, 수정]
   방어: 칸 개수가 8개가 아니면 그 줄은 건드리지 않는다 (관리자 설정·스킨 차이로 순서가 다를 수 있다)
   ========================================================================== */
(function (window, document) {
    'use strict';

    var SkinKit = window.SkinKit;
    if (!SkinKit || !SkinKit.adapters) return;

    var COLUMNS = ['check', 'fixed', 'name', 'recipient', 'phone', 'mobile', 'address', 'modify'];

    // 기능: 머리칸 글자가 없을 때 쓸 항목명
    var FALLBACK_LABELS = {
        name: '배송지명', recipient: '수령인', phone: '일반전화', mobile: '휴대전화', address: '주소'
    };

    var warned = false;

    // 기능: 머리줄(thead th) 글자를 칸 순서대로 읽는다
    // 이유: 쇼핑몰이 머리칸 문구를 바꿔도 카드에 같은 문구가 나오게 한다
    function readHeaders(table) {
        var headers = [];
        table.querySelectorAll('thead th').forEach(function (th) {
            headers.push(th.textContent.replace(/\s+/g, ' ').trim());
        });
        return headers;
    }

    function wrapCell(cell) {
        if (cell.firstElementChild && cell.firstElementChild.classList.contains('addr-value')
            && cell.childNodes.length === 1) return;
        var wrapper = document.createElement('div');
        wrapper.className = 'addr-value';
        while (cell.firstChild) wrapper.appendChild(cell.firstChild);
        cell.appendChild(wrapper);
    }

    function markRow(row, headers) {
        if (row.getAttribute('data-sk-adapted') === 'address-book') return;

        var cells = Array.prototype.filter.call(row.children, function (el) {
            return el.tagName === 'TD';
        });
        if (cells.length !== COLUMNS.length) {
            if (!warned && window.console) {
                warned = true;
                window.console.warn('[SkinKit] address-book: 주소록 칸 개수가 ' + cells.length + '개라 적용하지 않았습니다 (예상 8개)');
            }
            return;
        }

        cells.forEach(function (cell, index) {
            var key = COLUMNS[index];
            cell.classList.add('addr-' + key);
            if (FALLBACK_LABELS[key]) {
                cell.setAttribute('data-label', headers[index] || FALLBACK_LABELS[key]);
            }
            wrapCell(cell);
        });

        row.classList.add('addr-item');
        row.setAttribute('data-sk-adapted', 'address-book');
    }

    SkinKit.adapters.register('address-book', {
        match: '.xans-myshop-addrlist, .xans-myshop-addrlist tr.xans-record-',
        run: function (root) {
            root.querySelectorAll('.xans-myshop-addrlist .ec-base-table table').forEach(function (table) {
                table.classList.add('addr-table');
                var headers = readHeaders(table);
                table.querySelectorAll('tbody tr.xans-record-').forEach(function (row) {
                    markRow(row, headers);
                });
            });
        }
    });
})(window, document);
