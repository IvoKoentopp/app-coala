// Correção para o problema do mobile e iPad
(function() {
    // Previne o comportamento de bounce no iOS
    document.addEventListener('touchmove', function(e) {
        if(e.target === document.documentElement) {
            e.preventDefault();
        }
    }, { passive: false });

    // Corrige o problema de altura do viewport no iOS
    function fixIOSViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    window.addEventListener('resize', fixIOSViewportHeight);
    window.addEventListener('orientationchange', fixIOSViewportHeight);
    fixIOSViewportHeight();

    // Corrige o problema do fetch
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        if (url.includes('games?select=')) {
            // Modifica a URL para usar os campos corretos
            url = url.replace('games?select=*', 'games?select=id,date,location,status');
            
            // Adiciona os headers necessários
            options = options || {};
            options.headers = {
                ...options.headers,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache' // Previne problemas de cache no iOS
            };
        }
        return originalFetch(url, options);
    };

    // Desativa o zoom no duplo toque em iOS
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(e) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
})();
