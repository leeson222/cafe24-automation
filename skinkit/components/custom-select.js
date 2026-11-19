/* ==========================================================================
   SkinKit · components/custom-select.js   (공통 — head.html에서 모든 페이지에 불러온다. 2026-11-19 선택 기능에서 공통으로 옮김)
   기능: 원본 <select>를 화면에서 숨기고 ul/li 커스텀 select(components/custom-select.css)를 바로 뒤에 만든다.
         원본 select는 그대로 남아 값 전송·카페24 이벤트를 담당한다 (프록시 방식).
   이유: 원본 select는 브라우저마다 목록 모양이 달라 시안대로 꾸밀 수 없다.
         novadeal dropdown.js(전체 select), basket.js(옵션 변경 레이어), product.js(상품 상세 옵션)에 따로 있던 코드를 합쳤다.
         상품 옵션 select(ec-option-select-finder)는 "옵션 모드"로 만든다 (.custom-select--option, 2026-11-19 추가):
           구분선 제외, select마다 감시(조합형 옵션 다시 채움·disabled), 고른 뒤 전체 옵션 다시 맞춤

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
           exclude: ['…'], // 추가로 뺄 선택자 (기본 제외 목록에 더해진다)
           option:  false   // 상품 옵션 select를 원본 그대로 둘 때 (기본: 옵션 모드로 바꾼다)
         }
         특정 select만 빼려면 <select data-sk-native> 를 붙인다
   ========================================================================== */
(function (window, document) {
    'use strict';

    // 기능: core.js가 먼저 불렸든 나중에 불리든 등록한다
    // 이유: 카페24가 페이지 @js와 레이아웃 @js의 출력 순서를 보장하지 않을 수 있다. 먼저 불리면 대기열에 맡긴다
    var SkinKit = window.SkinKit = window.SkinKit || {};
    function register(name, def) {
        if (SkinKit.adapters) SkinKit.adapters.register(name, def);
        else (SkinKit._pendingAdapters = SkinKit._pendingAdapters || []).push([name, def]);
    }

    var config = (window.SkinKitConfig || {}).customSelect || {};

    var TARGET = config.target || '#contents select, #popup select, .ec-base-layer select';

    // 기능: 항상 빼는 영역
    // 이유: 주문서·결제(절대 규칙 7)는 설정으로도 켤 수 없게 한다
    var ALWAYS_EXCLUDE = '.xans-order-form select, #mCafe24Order select';

    // 기능: 기본으로 빼는 대상 (설정 exclude가 여기에 더해진다)
    // 이유: 상품 옵션 select는 카페24 가격 계산·재고 확인이 연결되어 있다 (절대 규칙 6).
    //       그중 카페24 옵션 select(ec-option-select-finder)만 아래 옵션 모드로 따로 받는다. 나머지(세트·추가구성 영역 등)는 원본 그대로
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

    // 기능: 상품 상세 옵션 select (옵션 모드)
    // 이유: novadeal product.js(747~974행)의 옵션 커스텀을 옮겼다. 위 기본 제외보다 먼저 판단한다.
    //       카페24 옵션 select(option_select_element="ec-option-select-finder")만 대상이다.
    //       원본 select는 그대로 두고 값만 바꿔 change를 보내므로 카페24 가격 계산·조합형 연동·재고 확인이 그대로 돈다 (절대 규칙 6).
    //       끄려면 SkinKitConfig.customSelect.option = false
    var OPTION_TARGET = '.xans-product-option select[option_select_element="ec-option-select-finder"]';
    var OPTION_ENABLED = config.option !== false;

    // 기능: 옵션 목록의 구분선 (카페24가 넣는 "**" 값, "-------" 글자)
    // 이유: 고를 수 없는 줄이라 목록에서 뺀다 (novadeal과 같다)
    function isDivider(option) {
        return option.value === '**' || /^-+$/.test(option.text.trim());
    }

    var uid = 0;
    var instances = [];          // { select, root, button, text, list, isOption, observer }
    var documentBound = false;

    // ----------------------------------------------------------------
    // 대상 판별
    // ----------------------------------------------------------------
    function isOptionSelect(select) {
        return OPTION_ENABLED && select.matches(OPTION_TARGET) && !select.matches('[data-sk-native]');
    }

    function isTarget(select) {
        if (select.closest('.xans-order-form, #mCafe24Order')) return false;
        if (select.matches(ALWAYS_EXCLUDE)) return false;
        if (isOptionSelect(select)) return true;
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
    // 기능: 원본 select가 받던 너비를 커스텀 select에 넣는다
    // 이유: 쇼핑몰·카페24 CSS는 select 너비를 id로 정한다 (skin4: #birth_year { width: 24% !important }).
    //       커스텀 select에는 id가 없어 너비를 잃고 글자 폭(44px)으로 줄었다 (2026-11-19 skin4 회원가입에서 확인).
    //       숨김 class를 잠깐 빼고 같은 프레임 안에서 재기 때문에 화면에 깜빡임이 없다.
    //       %·미디어쿼리 너비도 따라가도록 부모 크기가 바뀔 때 다시 잰다.
    //       0이면(레이어가 닫혀 있어 display:none 등) 넣지 않고, 보일 때 다시 잰다
    // ----------------------------------------------------------------
    function syncWidth(instance) {
        var select = instance.select;
        if (!select.isConnected) return;
        select.classList.remove('sk-visually-hidden');
        var width = select.getBoundingClientRect().width;
        select.classList.add('sk-visually-hidden');
        if (width > 0) instance.root.style.width = Math.round(width) + 'px';
    }

    // 기능: 부모 크기 변화 감시 (감시자 하나를 모든 인스턴스가 함께 쓴다)
    // 이유: 창 크기, 레이어 열림, 탭 전환으로 부모 폭이 바뀌면 % 너비가 달라진다
    var resizeObserver = null;
    function watchWidth(instance) {
        if (!('ResizeObserver' in window) || !instance.select.parentElement) return;
        if (!resizeObserver) {
            resizeObserver = new ResizeObserver(function (entries) {
                var parents = entries.map(function (entry) { return entry.target; });
                instances.forEach(function (item) {
                    if (parents.indexOf(item.select.parentElement) > -1) syncWidth(item);
                });
            });
        }
        resizeObserver.observe(instance.select.parentElement);
    }

    // ----------------------------------------------------------------
    // 기능: 옵션 select를 카페24가 바꾸면 화면을 다시 맞춘다 (옵션 모드)
    // 이유: 조합형 옵션은 첫 옵션을 고르면 카페24가 다음 select의 option을 새로 채우고 disabled를 바꾼다.
    //       core 감시는 "새로 생긴 select/option"만 보므로 속성 변화(disabled)는 select마다 따로 본다.
    //       class는 보지 않는다. syncWidth가 select의 숨김 class를 잠깐 바꾸므로 반복 실행이 생긴다
    // ----------------------------------------------------------------
    function watchOption(instance) {
        if (!('MutationObserver' in window)) return;
        instance.observer = new MutationObserver(function () { syncSelected(instance); });
        instance.observer.observe(instance.select, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['disabled', 'selected', 'label']
        });
    }

    // 기능: 옵션 select 전체를 다시 맞춘다
    // 이유: 카페24는 옵션을 고르면 선택 상품(#totalProducts)에 추가한 뒤 select 값을 이벤트 없이 처음으로 되돌리기도 한다.
    //       그 경우 change도 속성 변화도 생기지 않아, 고른 직후와 잠시 뒤(300ms, 카페24 처리 대기) 한 번 더 읽는다.
    //       novadeal은 100ms 한 번이었다 [확인 필요: 카페24 처리 시간]
    function resyncOptions() {
        instances.forEach(function (instance) {
            if (instance.isOption) syncSelected(instance);
        });
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

        var instance = { select: select, root: root, button: button, text: text, list: list, signature: '', activeIndex: -1, isOption: isOptionSelect(select), observer: null };
        instances.push(instance);
        if (instance.isOption) {
            root.classList.add('custom-select--option');
            watchOption(instance);
        }

        syncWidth(instance);
        watchWidth(instance);

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
            if (instance.isOption && isDivider(option)) continue;
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
        if (instance.isOption) {
            resyncOptions();
            setTimeout(resyncOptions, 300);
        }
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
            if (instance.observer) instance.observer.disconnect();
            if (instance.root.isConnected) instance.root.remove();
            return false;
        });
    }

    register('custom-select', {
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
