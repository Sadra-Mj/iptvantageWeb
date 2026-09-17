// Keep the website dependency-free so it works on static hosting and when
// index.html is opened directly from disk. The bot validates the same product
// IDs and prices from subscription-plans.mjs before it creates an order.
const SUBSCRIPTION_PLANS = Object.freeze({
    standard: Object.freeze({
        id: 'standard',
        name: 'Standard',
        description: 'Everything you need to start streaming',
        durations: Object.freeze([
            Object.freeze({ id: 'standard_1m', months: 1, label: '1 Month', price: 14.99 }),
            Object.freeze({ id: 'standard_3m', months: 3, label: '3 Months', price: 34.99 }),
            Object.freeze({ id: 'standard_6m', months: 6, label: '6 Months', price: 49.99 }),
            Object.freeze({ id: 'standard_12m', months: 12, label: '1 Year', price: 69.99 })
        ])
    }),
    gold: Object.freeze({
        id: 'gold',
        name: 'Gold',
        description: 'More value for committed viewers',
        durations: Object.freeze([
            Object.freeze({ id: 'gold_3m', months: 3, label: '3 Months', price: 44.99 }),
            Object.freeze({ id: 'gold_6m', months: 6, label: '6 Months', price: 59.99 }),
            Object.freeze({ id: 'gold_12m', months: 12, label: '1 Year', price: 84.99 })
        ])
    }),
    premium: Object.freeze({
        id: 'premium',
        name: 'Premium',
        description: 'The ultimate IPTV experience',
        durations: Object.freeze([
            Object.freeze({ id: 'premium_6m', months: 6, label: '6 Months', price: 74.99 }),
            Object.freeze({
                id: 'premium_12m',
                months: 12,
                label: '1 Year',
                price: 99.99,
                badge: 'BEST VALUE'
            })
        ])
    })
});

const PAYMENT_BOT_USERNAME = window.IPTVANTAGE_CONFIG?.paymentBotUsername || 'vantagepaybot';

document.addEventListener('DOMContentLoaded', () => {
    // --- Carousel Logic ---
    const slides = document.querySelectorAll('.carousel-slide');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const dotsContainer = document.getElementById('carousel-dots');
    
    if (slides.length > 0) {
        let currentSlide = 0;
        let isPlaying = true;
        let slideInterval = setInterval(nextSlide, 5000);

        function showSlide(index) {
            slides.forEach(slide => slide.classList.remove('active'));
            slides[index].classList.add('active');
            updateDots(index);
            currentSlide = index;
        }

        function nextSlide() {
            let newIndex = (currentSlide + 1) % slides.length;
            showSlide(newIndex);
        }

        function updateDots(index) {
            const dots = dotsContainer.querySelectorAll('.dot');
            dots.forEach(dot => dot.classList.remove('active'));
            if (dots[index]) dots[index].classList.add('active');
        }

        function createDots() {
            slides.forEach((_, index) => {
                const dot = document.createElement('button');
                dot.classList.add('dot');
                dot.setAttribute('data-index', index);
                dotsContainer.appendChild(dot);
            });
            dotsContainer.addEventListener('click', e => {
                if (e.target.matches('.dot')) {
                    const index = Number(e.target.dataset.index);
                    showSlide(index);
                    if (isPlaying) {
                        clearInterval(slideInterval);
                        slideInterval = setInterval(nextSlide, 5000);
                    }
                }
            });
        }

        playPauseBtn.addEventListener('click', () => {
            if (isPlaying) {
                clearInterval(slideInterval);
                playPauseBtn.classList.add('pause');
            } else {
                slideInterval = setInterval(nextSlide, 5000);
                playPauseBtn.classList.remove('pause');
            }
            isPlaying = !isPlaying;
        });

        createDots();
        showSlide(0);
    }

    // --- HLS Player & Channel Switching Logic ---
    const video = document.getElementById('video-player');
    const channelItems = document.querySelectorAll('.channel-item');
    const tvScreen = document.getElementById('tv-screen-area');
    const channelOverlay = document.getElementById('channel-list-overlay');
    let hls = null;

    function loadChannel(url) {
        if (hls) hls.destroy();
        if (video && typeof window.Hls !== 'undefined' && window.Hls.isSupported()) {
            hls = new window.Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(window.Hls.Events.MANIFEST_PARSED, () => video.play());
        } else if (video && video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
            video.addEventListener('loadedmetadata', () => video.play());
        }
    }

    // Initialize with active channel
    const activeChannel = document.querySelector('.channel-item.active');
    if (activeChannel) loadChannel(activeChannel.dataset.src);

    // Click to Toggle List
    if (tvScreen && channelOverlay) {
        tvScreen.addEventListener('click', (e) => {
            // Only toggle if the video itself was clicked, not controls or list items
            if (e.target === video || e.target === tvScreen) {
                channelOverlay.classList.toggle('visible');
            }
        });
    }

    // Switch Channel on Item Click
    channelItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent toggling menu when selecting channel
            channelItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            loadChannel(item.dataset.src);
        });
    });

    // --- Media Controls ---
    const volumeBtn = document.getElementById('volume-btn');
    if (volumeBtn && video) {
        volumeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            video.muted = !video.muted;
            volumeBtn.querySelector('.volume-on').style.display = video.muted ? 'none' : 'block';
            volumeBtn.querySelector('.volume-off').style.display = video.muted ? 'block' : 'none';
        });
    }

    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const container = document.querySelector('.tv-player-container');
            if (document.fullscreenElement) document.exitFullscreen();
            else container.requestFullscreen().catch(() => {});
        });
    }

    // --- Infinite Scroller Animation ---
    const scrollers = document.querySelectorAll(".scroller");
    scrollers.forEach((scroller) => {
        scroller.setAttribute("data-animated", true);
        const inner = scroller.querySelector(".scroller-inner");
        const content = Array.from(inner.children);
        content.forEach((item) => {
            const dup = item.cloneNode(true);
            dup.setAttribute("aria-hidden", true);
            inner.appendChild(dup);
        });
    });

    // --- Scroll-to-Zoom Logic ---
    const scrollZoomSection = document.querySelector('.scroll-zoom-section');
    if (scrollZoomSection) {
        const videoWrapper = document.querySelector('.scroll-zoom-video-wrapper');
        const initialContent = document.querySelector('.scroll-zoom-content-initial');
        const infoPanel1 = document.getElementById('info-panel-1');
        const infoPanel2 = document.getElementById('info-panel-2');
        const videoOverlay = document.querySelector('.scroll-zoom-video-overlay');

        window.addEventListener('scroll', () => {
            const sectionTop = scrollZoomSection.offsetTop;
            const sectionHeight = scrollZoomSection.offsetHeight;
            const scrollPosition = window.scrollY;

            if (scrollPosition >= sectionTop && scrollPosition <= sectionTop + sectionHeight - window.innerHeight) {
                const progress = (scrollPosition - sectionTop) / (sectionHeight - window.innerHeight);

                const phases = {
                    zoomIn: { start: 0.0, end: 0.15 },
                    panel1FadeIn: { start: 0.20, end: 0.30 },
                    panel1Hold: { start: 0.30, end: 0.45 },
                    panel1FadeOut: { start: 0.45, end: 0.55 },
                    panel2FadeIn: { start: 0.60, end: 0.70 },
                    panel2Hold: { start: 0.70, end: 0.85 },
                    zoomOut: { start: 0.85, end: 1.0 }
                };
                
                const getPhaseProgress = (phase) => {
                    if (progress < phase.start) return 0;
                    if (progress > phase.end) return 1;
                    return (progress - phase.start) / (phase.end - phase.start);
                };

                if (progress < phases.zoomOut.start) {
                    const phaseProgress = getPhaseProgress(phases.zoomIn);
                    const scaleX = 1 + (window.innerWidth / videoWrapper.offsetWidth - 1) * phaseProgress;
                    const scaleY = 1 + (window.innerHeight / videoWrapper.offsetHeight - 1) * phaseProgress;
                    const scale = Math.max(scaleX, scaleY);
                    
                    videoWrapper.style.transform = `scale(${scale})`;
                    videoWrapper.style.borderRadius = `${30 * (1 - phaseProgress)}px`;
                    if (initialContent) initialContent.style.opacity = 1 - (phaseProgress * 2.5);
                    if (videoOverlay) videoOverlay.style.opacity = phaseProgress * 0.7;
                } else {
                     const phaseProgress = getPhaseProgress(phases.zoomOut);
                     const scaleX = 1 + (window.innerWidth / videoWrapper.offsetWidth - 1) * (1 - phaseProgress);
                     const scaleY = 1 + (window.innerHeight / videoWrapper.offsetHeight - 1) * (1 - phaseProgress);
                     const scale = Math.max(scaleX, scaleY);
                     
                     videoWrapper.style.transform = `scale(${scale})`;
                     videoWrapper.style.borderRadius = `${30 * phaseProgress}px`;
                     if (videoOverlay) videoOverlay.style.opacity = 0.7 * (1 - phaseProgress);
                }

                if (infoPanel1) {
                    if (progress >= phases.panel1FadeIn.start && progress < phases.panel1FadeOut.start) {
                        const phaseProgress = getPhaseProgress(phases.panel1FadeIn);
                        infoPanel1.style.opacity = phaseProgress;
                        infoPanel1.style.transform = `translateY(${30 * (1 - phaseProgress)}px)`;
                    } else if (progress >= phases.panel1FadeOut.start && progress < phases.panel2FadeIn.start) {
                         const phaseProgress = getPhaseProgress(phases.panel1FadeOut);
                         infoPanel1.style.opacity = 1 - phaseProgress;
                         infoPanel1.style.transform = `translateY(${30 * phaseProgress}px)`;
                    } else {
                        infoPanel1.style.opacity = 0;
                    }
                }

                if (infoPanel2) {
                    if (progress >= phases.panel2FadeIn.start && progress < phases.zoomOut.start) {
                         const phaseProgress = getPhaseProgress(phases.panel2FadeIn);
                         infoPanel2.style.opacity = phaseProgress;
                         infoPanel2.style.transform = `translateY(${30 * (1 - phaseProgress)}px)`;
                    } else if(progress >= phases.zoomOut.start){
                        const phaseProgress = getPhaseProgress({start: phases.panel2Hold.end, end: phases.zoomOut.start});
                         infoPanel2.style.opacity = 1- phaseProgress;
                         infoPanel2.style.transform = `translateY(${30 * phaseProgress}px)`;
                    } else {
                        infoPanel2.style.opacity = 0;
                    }
                }
            }
        });

        const scrollVideo = document.querySelector('.scroll-zoom-video');
        if (scrollVideo) scrollVideo.play();
    }

    // --- App Tabs Logic ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.apps-tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            tabContents.forEach(content => {
                content.classList.toggle('active', content.id === tab);
            });
        });
    });

    // --- Subscription Selector & Telegram Bot Link ---
    const planChoices = document.querySelectorAll('.plan-choice');
    const subscriptionWorkspace = document.querySelector('.subscription-workspace');
    const planName = document.getElementById('selected-plan-name');
    const planDescription = document.getElementById('selected-plan-description');
    const summaryPlanName = document.getElementById('summary-plan-name');
    const summaryPackage = document.getElementById('summary-package');
    const durationOptions = document.getElementById('duration-options');
    const selectedPrice = document.getElementById('selected-price');
    const selectedDuration = document.getElementById('selected-duration');
    const subscribeButton = document.getElementById('subscribe-button');
    let selectedPlanId = null;
    let subscriptionScrollFrame = null;
    let hasAutoScrolledToOptions = false;

    function glideTo(targetY, duration = 1050) {
        const startY = window.scrollY;
        const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const destination = Math.max(0, Math.min(targetY, maxY));
        const distance = destination - startY;

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            window.scrollTo(0, destination);
            return;
        }

        if (subscriptionScrollFrame) cancelAnimationFrame(subscriptionScrollFrame);
        const startTime = performance.now();
        const easeInOutQuint = (progress) => progress < 0.5
            ? 16 * progress ** 5
            : 1 - ((-2 * progress + 2) ** 5) / 2;

        const animateScroll = (currentTime) => {
            const progress = Math.min((currentTime - startTime) / duration, 1);
            window.scrollTo(0, startY + distance * easeInOutQuint(progress));

            if (progress < 1) {
                subscriptionScrollFrame = requestAnimationFrame(animateScroll);
            } else {
                subscriptionScrollFrame = null;
            }
        };

        subscriptionScrollFrame = requestAnimationFrame(animateScroll);
    }

    const formatPrice = (price) => new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: 'EUR'
    }).format(price);

    function selectDuration(duration) {
        selectedPrice.textContent = formatPrice(duration.price);
        selectedDuration.textContent = duration.label;
        subscribeButton.dataset.productId = duration.id;

        durationOptions.querySelectorAll('.duration-option').forEach((button) => {
            const isSelected = button.dataset.productId === duration.id;
            button.classList.toggle('active', isSelected);
            button.setAttribute('aria-checked', String(isSelected));
        });
    }

    function renderPlan(planId) {
        const plan = SUBSCRIPTION_PLANS[planId];
        if (!plan || !durationOptions) return;

        selectedPlanId = planId;
        subscriptionWorkspace.hidden = false;
        subscriptionWorkspace.classList.remove('tier-standard', 'tier-gold', 'tier-premium');
        subscriptionWorkspace.classList.add(`tier-${planId}`);
        planName.textContent = plan.name.toUpperCase();
        planDescription.textContent = plan.description;
        summaryPlanName.textContent = plan.name;
        summaryPackage.textContent = plan.name;
        durationOptions.replaceChildren();

        plan.durations.forEach((duration, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'duration-option';
            button.style.setProperty('--option-index', index);
            button.dataset.productId = duration.id;
            button.setAttribute('role', 'radio');
            button.setAttribute('aria-checked', 'false');

            const details = document.createElement('span');
            details.className = 'duration-details';

            const durationCopy = document.createElement('span');
            durationCopy.className = 'duration-copy';

            const label = document.createElement('span');
            label.className = 'duration-label';
            label.textContent = duration.label;

            const accessLabel = document.createElement('span');
            accessLabel.className = 'duration-access';
            accessLabel.textContent = `${duration.months} ${duration.months === 1 ? 'month' : 'months'} access`;

            const priceCopy = document.createElement('span');
            priceCopy.className = 'duration-price-copy';

            const price = document.createElement('span');
            price.className = 'duration-price';
            price.textContent = formatPrice(duration.price);

            const monthly = document.createElement('span');
            monthly.className = 'duration-monthly';
            monthly.textContent = `${formatPrice(duration.price / duration.months)}/mo`;

            durationCopy.append(label, accessLabel);
            priceCopy.append(price, monthly);
            details.append(durationCopy, priceCopy);
            button.append(details);

            if (duration.badge) {
                button.classList.add('best-value');
                const badge = document.createElement('span');
                badge.className = 'best-value-badge';
                badge.textContent = duration.badge;
                button.append(badge);
            }

            button.addEventListener('click', () => selectDuration(duration));
            durationOptions.append(button);
        });

        const preferredDuration = plan.durations[plan.durations.length - 1];
        selectDuration(preferredDuration);

        planChoices.forEach((choice) => {
            const isSelected = choice.dataset.plan === selectedPlanId;
            choice.classList.toggle('active', isSelected);
            choice.setAttribute('aria-checked', String(isSelected));
        });

        subscriptionWorkspace.classList.remove('is-revealing');
        void subscriptionWorkspace.offsetWidth;
        subscriptionWorkspace.classList.add('is-revealing');
    }

    planChoices.forEach((choice) => {
        choice.addEventListener('click', () => {
            renderPlan(choice.dataset.plan);
            if (hasAutoScrolledToOptions) return;
            hasAutoScrolledToOptions = true;

            window.setTimeout(() => {
                if (window.matchMedia('(max-width: 576px)').matches) {
                    const workspaceTop = window.scrollY
                        + subscriptionWorkspace.getBoundingClientRect().top
                        - 115;
                    glideTo(workspaceTop, 1100);
                    return;
                }

                glideTo(window.scrollY + Math.min(450, window.innerHeight * 0.42), 1100);
            }, 120);
        });
    });

    // --- Mobile Menu Logic ---
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navBar = document.querySelector('nav');
    if (menuToggle && navLinks && navBar) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            menuToggle.classList.toggle('active');
            navBar.classList.toggle('nav-open');
        });
    }

    // --- Modal Logic ---
    const privacyLink = document.getElementById('privacy-link');
    const termsLink = document.getElementById('terms-link');
    const closeButtons = document.querySelectorAll('.close-button');

    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    }

    function closeModal(modal) {
        if (modal) modal.classList.remove('active');
    }

    privacyLink?.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('privacy-modal');
    });

    termsLink?.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('terms-modal');
    });

    closeButtons.forEach(button => {
        button.addEventListener('click', () => closeModal(button.closest('.modal')));
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) closeModal(e.target);
    });

    // --- Interaction Protections ---
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => {
        if (e.key === 'F12' || e.keyCode === 123) e.preventDefault();
        if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) e.preventDefault();
        if (e.ctrlKey && (e.key === 'U' || e.key === 'S' || e.key === 'P')) e.preventDefault();
    });
    document.addEventListener('selectstart', e => e.preventDefault());
});
