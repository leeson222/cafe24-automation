/*! SkinKit adapters/address-form.js — 자동 생성. 직접 고치지 말고 skinkit/adapters/address-form.js을 고친 뒤 다시 빌드한다 (bp layout 1024 / small 767) */
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

    // 기능: core.js가 먼저 불렸든 나중에 불리든 등록한다
    // 이유: 카페24가 페이지 @js와 레이아웃 @js의 출력 순서를 보장하지 않을 수 있다. 먼저 불리면 대기열에 맡긴다
    var SkinKit = window.SkinKit = window.SkinKit || {};
    function register(name, def) {
        if (SkinKit.adapters) SkinKit.adapters.register(name, def);
        else (SkinKit._pendingAdapters = SkinKit._pendingAdapters || []).push([name, def]);
    }

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

    register('address-form', {
        match: '#postcode1',
        run: function (root) {
            containers.forEach(function (selector) {
                root.querySelectorAll(selector).forEach(wrap);
            });
        }
    });
})(window, document);
