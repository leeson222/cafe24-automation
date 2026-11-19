/* ==========================================================================
   SkinKit · adapters/core.js   (공통 — head.html에서 모든 페이지에 불러온다)
   기능: Style Adapter 등록·실행 관리
         - 켜기: adapter 파일을 불러오면 켜진다 (필요한 페이지 파일 상단에서 @js로 부른다)
         - 실행: DOM 준비 후 한 번, 이후 카페24가 요소를 다시 그리면 해당 adapter만 다시 실행
   이유: novadeal은 기능마다 MutationObserver를 따로 달아 71개(그중 body 전체 감시 42개)였다.
         감시 장치를 하나만 두고, 새로 생긴 노드가 adapter의 대상일 때만 실행한다.
   불러오는 순서: adapter가 core.js보다 먼저 불려도 된다.
         카페24가 페이지 파일의 @js를 레이아웃의 @js보다 앞에 출력할 수도 있어서,
         먼저 불린 adapter는 SkinKit._pendingAdapters에 등록을 맡겨 두고 core.js가 받아 실행한다
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
    var isReady = false;
    var observer = null;

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
        order.forEach(runOne);
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
                    if (pending[name]) return;
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

    // 기능: 등록된 adapter가 있을 때만 감시를 시작한다
    // 이유: adapter를 하나도 불러오지 않은 페이지에서는 감시 비용이 없게 한다
    function startObserver() {
        if (observer || !document.body || !order.length) return;
        observer = new MutationObserver(onMutations);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function onReady() {
        isReady = true;
        runAll();
        startObserver();
    }

    function register(name, def) {
        if (registry[name]) return;
        registry[name] = def;
        order.push(name);
        // 이유: DOM 준비 후에 늦게 불러온 adapter도 바로 적용되게 한다
        if (isReady) {
            runOne(name);
            discardOwnMutations();
            startObserver();
        }
    }

    // ----------------------------------------------------------------
    // 공개 API
    // ----------------------------------------------------------------
    SkinKit.adapters = {
        /**
         * 기능: adapter 등록 (등록하면 켜진다)
         * @param {string} name
         * @param {{match: string, run: function(Document)}} def
         *        match: 다시 실행할지 판단할 CSS 선택자 (새로 생긴 노드가 이것이거나 포함하면 실행)
         *        run:   실제 작업. 여러 번 불려도 결과가 같아야 한다
         */
        register: register,

        // 기능: 쇼핑몰 JS가 DOM을 직접 바꾼 뒤 adapter를 다시 적용할 때 쓴다
        refresh: function (name) {
            if (name) {
                if (registry[name]) runOne(name);
                discardOwnMutations();
            } else {
                runAll();
            }
        },

        // 기능: 지금 켜진 adapter 이름 목록 (확인용)
        list: function () {
            return order.slice();
        }
    };

    // 기능: core.js보다 먼저 불린 adapter의 등록을 받는다
    (SkinKit._pendingAdapters || []).forEach(function (entry) {
        register(entry[0], entry[1]);
    });
    delete SkinKit._pendingAdapters;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        onReady();
    }
})(window, document);
