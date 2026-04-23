class ShortVideo extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        document.addEventListener('sync-volume', e => {
            const shouldMute = e.detail.muted;
            this.updateVolumeState(shouldMute);
        });

        this.isMuted = true;
    
        // Наблюдатель, сработает на отображении 70% видео на экране
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const video = this.shadowRoot.querySelector('.main-video');
                if (!video) return;

                entry.isIntersecting ? video.play() : video.pause();
            });
        }, { threshold: 0.7 });
    }

    updateVolumeState(isMuted) {
        const video = this.shadowRoot.querySelector('.main-video');
        const muteBtn = this.shadowRoot.querySelector('.mute-btn');
        if (!video || !muteBtn) return;

        video.muted = isMuted;
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
    }

    toggleMute(e) {
        e.stopPropagation();
        const video = this.shadowRoot.querySelector('.main-video');
        const newState = !video.muted;

        const event = new CustomEvent('sync-volume', {
            detail: { muted: newState },
            bubbles: true,
            composed: true,
        });
        this.dispatchEvent(event);
    }

    connectedCallback() {
        this.render();
        this.observer.observe(this);
        this.setupInteractions();
    }

    disconnectedCallback() {
        this.observer.disconnect();
    }

    setupInteractions() {
        const mainVideo = this.shadowRoot.querySelector('.main-video');
        const bgVideo = this.shadowRoot.querySelector('.video-bg');

        const muteBtn = this.shadowRoot.querySelector('.mute-btn');
        const spinner = this.shadowRoot.querySelector('.spinner');
        const heart = this.shadowRoot.querySelector('.big-heart');

        const progressBar = this.shadowRoot.querySelector('.progress-bar');
        const progressContainer = this.shadowRoot.querySelector('.progress-container');

        if (bgVideo) {
            mainVideo.onplay = () => bgVideo.play();
            mainVideo.onpause = () => bgVideo.pause();
            mainVideo.onseeking = () => bgVideo.currentTime = mainVideo.currentTime;
        }

        mainVideo.ontimeupdate = () => {
            const percentage = (mainVideo.currentTime / mainVideo.duration) * 100;
            progressBar.style.width = `${percentage}%`;
        };

        progressContainer.onclick = e => {
            e.stopPropagation();
            const rect = progressContainer.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            mainVideo.currentTime = pos * mainVideo.duration;
        };

        /// ЛОГИКА СПИННЕРА
        mainVideo.onwaiting = () => spinner.style.display = 'block';
        mainVideo.onplaying = () => spinner.style.display = 'none';

        mainVideo.onclick = () => mainVideo.paused ? mainVideo.play() : mainVideo.pause()

        /// ЛОГИКА ЛАЙКА
        let lastTap = 0;
        mainVideo.addEventListener('click', e => {
            const now = Date.now();
            if (now - lastTap < 300) {
                this.showHeart(heart);
            }
            lastTap = now;
        });

        muteBtn.onclick = e => this.toggleMute(e);
    }

    showHeart(heart) {
        heart.classList.remove('animate');
        void heart.offsetWidth; // Перезапуск CSS анимации
        heart.classList.add('animate');
    }

    render() {
        const src = this.getAttribute('src');
        const desc = this.getAttribute('description') || '';

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    position: relative;
                    height: 100vh;
                    width: 100vw;
                    aspect-ratio: 9 / 16;
                    margin: 0 auto;
                    scroll-snap-align: start;
                    scroll-snap-stop: always;
                    pointer-events: auto;
                    background: #000;
                }
                
                .video-bg-container {
                    display: none;
                }
                
                @media(min-width: 1024px) {
                    .video-bg-container {
                        display: block;
                        position: absolute;
                        top: 0; left: 0;
                        width: 100%; height: 100%;
                        z-index: 1;
                        overflow: hidden;
                        opacity: 0.7;
                    }
                    
                    .video-bg {
                        width: 100%; height: 100%;
                        object-fit: cover;
                        filter: blur(125px);
                        transform: scale(1.1);
                    }
                }
                
                .content-wrapper {
                    position: relative;
                    z-index: 2;
                    height: 100vh;
                    aspect-ratio: 9 / 16;
                    margin: 0 auto;
                    background: #000;
                }
                
                .main-video {
                    width: 100%; height: 100%;
                    object-fit: cover;
                    transform: translateZ(0);
                    will-change: transform;
                }

                .mute-btn {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    z-index: 10;
                    background: rgba(0, 0, 0, 0.1);
                    color: white;
                    border-radius: 50%;
                    width: 44px; height: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    cursor: pointer;
                    user-select: none;

                    backdrop-filter: blur(5px);
                    border: 1px solid rgba(255, 255, 255, 0.2);

                    pointer-events: auto;
                }

                .overlay {
                    display: block;
                    position: absolute;
                    z-index: 20;
                    bottom: 20px;
                    left: 20px;
                    color: white;
                }
                
                .overlay,
                .big-heart,
                .spinner,
                .video-bg,
                .video-bg-container {
                    pointer-events: none;
                }
                
                .spinner {
                    position: absolute;
                    top: 50%; left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 40px;
                    display: none;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }

                .big-heart {
                    position: absolute;
                    top: 50%; left: 50%;
                    transform: translate(-50%, -50%) scale(0);
                    font-size: 100px;
                    pointer-events: none;
                    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    opacity: 0;
                }
                .big-heart.animate {
                    animation: heart-pop 0.8s ease-out;
                }
                @keyframes heart-pop {
                    0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                    50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
                }
                
                .progress-container {
                    position: absolute;
                    bottom: 0; left: 0;
                    width: 100%;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.2);
                    z-index: 20;
                    cursor: pointer;
                }
                
                .progress-bar {
                    height: 100%;
                    width: 0;
                    background: #ff0050;
                    box-shadow: 0 0 10px #ff0050;
                    transition: width 0.1s linear;
                }
                
                .progress-container:hover {
                    height: 8px;
                }
            </style>
            
            <div class="video-bg-container">
                <video src="${src}" class="video-bg" loop muted playsinline ></video>                
            </div>
            <div class="content-wrapper">
                <video src="${src}" class="main-video" loop muted playsinline ></video>                
                <div class="spinner">⏳</div>
                <div class="big-heart">❤️</div>
                <div class="mute-btn">🔇</div>
                <div class="overlay">${desc}</div>
                <div class="progress-container">
                    <div class="progress-bar"></div>
                </div>
            </div>
        `;
    }
}

customElements.define('short-video', ShortVideo);
