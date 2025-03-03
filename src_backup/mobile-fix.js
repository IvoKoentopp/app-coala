// Correção para o problema do mobile
(function() {
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
                'Content-Type': 'application/json'
            };
        }
        return originalFetch(url, options);
    };
})();
