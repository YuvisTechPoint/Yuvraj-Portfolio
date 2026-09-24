/**
 * Book a Call — ₹10 / 30 min UPI payment flow
 * UPI ID: prasadyuvraj8805-5@okicici
 *
 * Auto-confirm: BHIM UPI deep links do not return a bank webhook to a static site.
 * After OPEN UPI / QR pay, we watch for return to this tab (visibility/focus) and
 * auto-confirm the booking. Manual "Already paid?" remains as fallback.
 */
(function () {
    'use strict';

    const UPI_ID = 'prasadyuvraj8805-5@okicici';
    const UPI_NAME = 'Yuvraj Prasad';
    const AMOUNT = '10.00';
    const DURATION = '30 minutes';
    const QRCODE_SRC = 'Assets/js/vendor/qrcode.min.js';
    const MIN_AWAY_MS = 2500;
    const CONTACT_CFG = window.YP_CONTACT_CONFIG || {};
    const PRODUCTION_BOOK_CALL_API = CONTACT_CFG.productionBookCallApiUrl || 'https://yuvrajprasad.vercel.app/api/book-call';

    function usesProductionBookCallApi() {
        const { protocol, hostname } = window.location;
        return protocol === 'file:' || hostname === 'localhost' || hostname === '127.0.0.1';
    }

    function getBookCallApiUrl() {
        return usesProductionBookCallApi() ? PRODUCTION_BOOK_CALL_API : '/api/book-call';
    }

    let bookingState = null;
    let releaseFocusTrap = null;
    let qrcodeReady = null;
    let awaitingPayment = false;
    let leftAt = 0;
    let confirming = false;
    let confirmed = false;

    const modal = document.getElementById('book-call-modal');
    const panel = document.getElementById('book-call-panel');
    const form = document.getElementById('book-call-form');
    const stepForm = document.getElementById('book-call-step-form');
    const stepPay = document.getElementById('book-call-step-pay');
    const stepDone = document.getElementById('book-call-step-done');
    const qrHost = document.getElementById('book-call-qr');
    const openUpiBtn = document.getElementById('book-open-upi');
    const formStatus = document.getElementById('book-form-status');
    const payStatus = document.getElementById('book-pay-status');
    const awaitingEl = document.getElementById('book-awaiting');
    const awaitingCopy = document.getElementById('book-awaiting-copy');

    if (!modal || !form) return;

    function toast(msg, type) {
        window.showToast?.(msg, type);
    }

    function showStatus(el, type, message) {
        if (!el) return;
        el.textContent = message;
        el.className = `font-mono text-sm font-bold form-status--${type}`;
        el.classList.remove('hidden');
    }

    function hideStatus(el) {
        if (!el) return;
        el.textContent = '';
        el.className = 'font-mono text-sm font-bold hidden';
    }

    function loadQrCodeLib() {
        if (typeof window.QRCode === 'function') return Promise.resolve(window.QRCode);
        if (qrcodeReady) return qrcodeReady;
        qrcodeReady = new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-book-qr="1"]');
            if (existing) {
                existing.addEventListener('load', () => {
                    if (typeof window.QRCode === 'function') resolve(window.QRCode);
                    else reject(new Error('QRCode missing after load'));
                });
                existing.addEventListener('error', () => reject(new Error('QR library failed')));
                return;
            }
            const script = document.createElement('script');
            script.src = QRCODE_SRC;
            script.async = true;
            script.dataset.bookQr = '1';
            script.onload = () => {
                if (typeof window.QRCode === 'function') resolve(window.QRCode);
                else reject(new Error('QRCode missing after load'));
            };
            script.onerror = () => reject(new Error('Could not load QR library'));
            document.head.appendChild(script);
        });
        return qrcodeReady;
    }

    function makeBookingRef() {
        const t = Date.now().toString(36).toUpperCase();
        const r = Math.random().toString(36).slice(2, 6).toUpperCase();
        return `CALL-${t}-${r}`;
    }

    function buildUpiUrl(ref, noteExtra) {
        const tn = encodeURIComponent(noteExtra.slice(0, 80));
        const pn = encodeURIComponent(UPI_NAME);
        const tr = encodeURIComponent(ref.slice(0, 35));
        return `upi://pay?pa=${UPI_ID}&pn=${pn}&am=${AMOUNT}&cu=INR&tn=${tn}&tr=${tr}`;
    }

    function showStep(step) {
        stepForm.hidden = step !== 'form';
        stepPay.hidden = step !== 'pay';
        stepDone.hidden = step !== 'done';
    }

    function setMinDate() {
        const dateInput = document.getElementById('book-date');
        if (!dateInput) return;
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.min = `${yyyy}-${mm}-${dd}`;
    }

    function stopAwaitingPayment() {
        awaitingPayment = false;
        leftAt = 0;
        if (awaitingEl) awaitingEl.hidden = true;
    }

    function startAwaitingPayment(reason) {
        if (!bookingState || confirmed || confirming) return;
        awaitingPayment = true;
        if (awaitingEl) awaitingEl.hidden = false;
        if (awaitingCopy) {
            awaitingCopy.textContent = reason === 'upi'
                ? 'Complete ₹10 in your UPI app. Returning here after payment will auto-confirm this booking.'
                : 'Scan the QR and pay ₹10. When you come back to this tab after paying, booking auto-confirms.';
        }
        showStatus(payStatus, 'success', 'Auto-confirm armed — finish UPI payment, then return here.');
    }

    function markLeftForPayment() {
        if (!awaitingPayment || confirmed) return;
        leftAt = Date.now();
    }

    function maybeAutoConfirmOnReturn() {
        if (!awaitingPayment || !bookingState || confirmed || confirming) return;
        if (!modal.classList.contains('open') || stepPay.hidden) return;
        if (document.visibilityState && document.visibilityState !== 'visible') return;

        const awayMs = leftAt ? Date.now() - leftAt : 0;
        // Only auto-confirm if the user actually left (UPI app / another app) for a beat
        if (awayMs < MIN_AWAY_MS) return;

        leftAt = 0;
        confirmBooking('auto');
    }

    function openBookCallModal() {
        setMinDate();
        hideStatus(formStatus);
        hideStatus(payStatus);
        stopAwaitingPayment();
        bookingState = null;
        confirming = false;
        confirmed = false;
        form.reset();
        showStep('form');
        modal.hidden = false;
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        releaseFocusTrap = window.ypTrapFocus?.(panel);
        document.getElementById('book-name')?.focus();
        window.pushGtmEvent?.('book_call_open');
        loadQrCodeLib().catch(() => {});
    }

    function closeBookCallModal() {
        stopAwaitingPayment();
        modal.classList.remove('open');
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        releaseFocusTrap?.();
        releaseFocusTrap = null;
    }

    window.ypOpenBookCall = openBookCallModal;
    window.ypCloseBookCall = closeBookCallModal;

    async function renderPaymentQr(upiUrl) {
        await loadQrCodeLib();
        if (!qrHost) throw new Error('QR host missing');
        qrHost.innerHTML = '';
        // eslint-disable-next-line no-new
        new window.QRCode(qrHost, {
            text: upiUrl,
            width: 232,
            height: 232,
            colorDark: '#121212',
            colorLight: '#ffffff',
            correctLevel: window.QRCode.CorrectLevel.M,
        });
    }

    function validateBookingForm() {
        const name = document.getElementById('book-name')?.value.trim() || '';
        const email = document.getElementById('book-email')?.value.trim() || '';
        const phone = document.getElementById('book-phone')?.value.trim() || '';
        const date = document.getElementById('book-date')?.value || '';
        const time = document.getElementById('book-time')?.value || '';
        const topic = document.getElementById('book-topic')?.value.trim() || '';

        if (!name || !email || !phone || !date || !time || !topic) {
            showStatus(formStatus, 'error', 'Fill in all booking fields.');
            toast('[ ✗ ERROR ] Complete the booking form.', 'error');
            return null;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showStatus(formStatus, 'error', 'Enter a valid email address.');
            toast('[ ✗ ERROR ] Invalid email.', 'error');
            return null;
        }

        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length < 10) {
            showStatus(formStatus, 'error', 'Enter a valid phone / WhatsApp number.');
            toast('[ ✗ ERROR ] Invalid phone number.', 'error');
            return null;
        }

        return { name, email, phone, date, time, topic };
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = validateBookingForm();
        if (!data) return;

        const continueBtn = document.getElementById('book-continue-btn');
        if (continueBtn) {
            continueBtn.disabled = true;
            continueBtn.textContent = 'GENERATING QR…';
        }

        const ref = makeBookingRef();
        const note = `Call booking ${ref} 30min`;
        const upiUrl = buildUpiUrl(ref, note);

        bookingState = { ...data, ref, upiUrl, amount: AMOUNT, duration: DURATION };
        confirmed = false;
        confirming = false;

        document.getElementById('book-ref-label').textContent = ref;
        document.getElementById('book-pay-summary').textContent =
            `${data.name} · ${data.date} ${data.time} IST · ${data.topic.slice(0, 80)}`;
        document.getElementById('book-upi-id').textContent = UPI_ID;

        if (openUpiBtn) {
            openUpiBtn.href = upiUrl;
            openUpiBtn.setAttribute('rel', 'noopener');
        }

        try {
            await renderPaymentQr(upiUrl);
            hideStatus(formStatus);
            showStep('pay');
            startAwaitingPayment('qr');
            window.pushGtmEvent?.('book_call_payment_view', { ref });
            toast('[ ✓ QR READY ] Pay ₹10 — booking auto-confirms on return.', 'success');
        } catch (err) {
            console.error(err);
            if (qrHost) {
                const imgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=232x232&ecc=M&margin=8&data=${encodeURIComponent(upiUrl)}`;
                qrHost.innerHTML = `<img src="${imgUrl}" width="232" height="232" alt="UPI payment QR for ${UPI_ID}">`;
            }
            showStep('pay');
            startAwaitingPayment('qr');
            toast('[ ✓ PAYMENT ] Open UPI or scan QR — auto-confirms on return.', 'info');
        } finally {
            if (continueBtn) {
                continueBtn.disabled = false;
                continueBtn.innerHTML = 'CONTINUE TO PAYMENT →';
            }
        }
    });

    document.getElementById('book-copy-upi')?.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(UPI_ID);
            toast(`[ ✓ COPIED ] ${UPI_ID}`, 'success');
        } catch {
            toast('[ ✗ COPY FAILED ] Copy the UPI ID manually.', 'error');
        }
    });

    document.getElementById('book-back-form')?.addEventListener('click', () => {
        stopAwaitingPayment();
        hideStatus(payStatus);
        showStep('form');
    });

    openUpiBtn?.addEventListener('click', (e) => {
        if (!bookingState?.upiUrl) {
            e.preventDefault();
            return;
        }
        startAwaitingPayment('upi');
        markLeftForPayment();
        // If the deep link fails to background the page (desktop), still mark left shortly after
        setTimeout(markLeftForPayment, 400);
        window.pushGtmEvent?.('book_call_upi_open', { ref: bookingState.ref });
    });

    async function notifyBooking(mode) {
        if (!bookingState) return false;
        const { name, email, phone, date, time, topic, ref, amount, duration, upiUrl } = bookingState;

        const payload = {
            name,
            email,
            phone,
            date,
            time,
            topic,
            ref,
            amount,
            duration,
            upiId: UPI_ID,
            confirmMode: mode === 'auto' ? 'auto' : 'manual',
            company: '',
        };

        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 25000);
            const res = await fetch(getBookCallApiUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            clearTimeout(timer);
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.success) {
                if (data.ref) bookingState.ref = data.ref;
                bookingState.mailResult = data.mailed || null;
                return true;
            }
            const msg = data.error || (res.status === 503
                ? 'Email service is not configured on the server. Add Gmail credentials on Vercel and redeploy.'
                : 'Could not confirm booking. Try again in a moment.');
            showStatus(payStatus, 'error', msg);
            toast(`[ ✗ FAILED ] ${msg}`, 'error');
            return false;
        } catch (err) {
            console.warn('Book-call API failed', err);
            showStatus(payStatus, 'error', 'Network error — check your connection and try again.');
            toast('[ ✗ FAILED ] Could not reach booking server.', 'error');
            return false;
        }
    }

    async function confirmBooking(mode) {
        if (!bookingState || confirming || confirmed) return;
        confirming = true;
        const btn = document.getElementById('book-confirm-paid');
        if (btn) {
            btn.disabled = true;
            btn.textContent = mode === 'auto' ? 'Auto-confirming…' : 'Confirming…';
        }
        if (awaitingCopy) {
            awaitingCopy.textContent = mode === 'auto'
                ? 'Payment return detected — confirming booking…'
                : 'Confirming booking…';
        }
        hideStatus(payStatus);
        showStatus(payStatus, 'success', mode === 'auto'
            ? 'Returned from UPI — auto-confirming…'
            : 'Confirming booking…');

        const ok = await notifyBooking(mode);
        if (ok) {
            confirmed = true;
            stopAwaitingPayment();
            document.getElementById('book-done-ref').textContent = bookingState.ref || '—';
            const mailed = bookingState.mailResult;
            const guestLine = mailed?.guest
                ? `Confirmation sent to ${bookingState.email}.`
                : 'We could not email the guest inbox — the host was notified.';
            document.getElementById('book-done-message').textContent =
                `Thanks, ${bookingState.name}! ${guestLine} Your slot: ${bookingState.date} ${bookingState.time} IST. Ref: ${bookingState.ref}.`;
            showStep('done');
            window.pushGtmEvent?.('book_call_confirmed', { ref: bookingState.ref, mode });
            toast(mode === 'auto'
                ? '[ ✓ AUTO-CONFIRMED ] Emails + report sent.'
                : '[ ✓ BOOKED ] Confirmation emails sent.', 'success');
        } else {
            showStatus(payStatus, 'error', 'Could not submit booking. Try “Already paid?” or email prasadyuvraj8805@gmail.com.');
            toast('[ ✗ FAILED ] Could not confirm booking.', 'error');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Already paid? Confirm now';
            }
        }
        confirming = false;
    }

    document.getElementById('book-confirm-paid')?.addEventListener('click', () => {
        confirmBooking('manual');
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            if (awaitingPayment) markLeftForPayment();
            return;
        }
        maybeAutoConfirmOnReturn();
    });

    window.addEventListener('pagehide', () => {
        if (awaitingPayment) markLeftForPayment();
    });

    window.addEventListener('pageshow', () => {
        maybeAutoConfirmOnReturn();
    });

    window.addEventListener('focus', () => {
        maybeAutoConfirmOnReturn();
    });

    document.addEventListener('resume', () => {
        maybeAutoConfirmOnReturn();
    });

    document.getElementById('book-call-close')?.addEventListener('click', closeBookCallModal);
    document.getElementById('book-done-close')?.addEventListener('click', closeBookCallModal);
    document.getElementById('book-call-open')?.addEventListener('click', openBookCallModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeBookCallModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) {
            closeBookCallModal();
        }
    });
})();
