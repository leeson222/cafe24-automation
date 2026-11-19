/* ==========================================================================
   SkinKit · adapters/address-book.js   (이름: address-book, 선택형)
   기능: 마이쇼핑 배송 주소록 표의 칸마다 이름(class)과 항목명(data-label)을 붙이고,
         칸 안쪽을 <div class="addr-value">로 감싼다. 배치는 pages/myshop.css가 한다.
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

    // 기능: core.js가 먼저 불렸든 나중에 불리든 등록한다
    // 이유: 카페24가 페이지 @js와 레이아웃 @js의 출력 순서를 보장하지 않을 수 있다. 먼저 불리면 대기열에 맡긴다
    var SkinKit = window.SkinKit = window.SkinKit || {};
    function register(name, def) {
        if (SkinKit.adapters) SkinKit.adapters.register(name, def);
        else (SkinKit._pendingAdapters = SkinKit._pendingAdapters || []).push([name, def]);
    }

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

    register('address-book', {
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
