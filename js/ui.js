export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
export function showToast(message, isError = false) {
    const box = document.createElement('div');
    box.className = isError ? 'toast toastError' : 'toast toastOk';
    box.textContent = message;
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3000);
}

export function showConfirm(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.innerHTML = `
            <div class="dialog">
                <p>${message}</p>
                <button id="cancelBtn">Hủy</button>
                <button id="okBtn">Xóa</button>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('#okBtn').onclick = () => {
            overlay.remove();
            resolve(true);
        };
        overlay.querySelector('#cancelBtn').onclick = () => {
            overlay.remove();
            resolve(false);
        };
    });
}

export function renderPagination(box, page, totalPages, onChange) {
    box.innerHTML = '';
    for (let p = 1; p <= totalPages; p++) {
        const button = document.createElement('button');

        button.textContent = p;
        button.disabled = p === page;

        button.onclick = () => onChange(p);

        box.appendChild(button);
    }
}

export function gradeBadge(grade) {
    const value = Number(grade);
    if (value >= 8) return '<span class="badge green">Great</span>';
    if (value >= 7) return '<span class="badge blue">Good</span>';
    if (value >= 5) return '<span class="badge yellow">Average</span>';
    return '<span class="badge red">Poor</span>';
}