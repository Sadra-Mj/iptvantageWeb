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
        if (Hls.isSupported() && video) {
            hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
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