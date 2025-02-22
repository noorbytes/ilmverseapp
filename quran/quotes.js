const quotes = [
    {
        text: "Indeed, with hardship comes ease.",
        reference: "Quran 94:6"
    },
    {
        text: "Allah does not burden a soul beyond that it can bear.",
        reference: "Quran 2:286"
    },
    {
        text: "So, verily, with every difficulty, there is relief.",
        reference: "Quran 94:5"
    },
    {
        text: "And He found you lost and guided you.",
        reference: "Quran 93:7"
    },
    {
        text: "My Lord, increase me in knowledge.",
        reference: "Quran 20:114"
    },
    {
        text: "For indeed, with hardship will be ease. Indeed, with hardship will be ease.",
        reference: "Quran 94:5-6"
    },
    {
        text: "And whoever relies upon Allah - then He is sufficient for him.",
        reference: "Quran 65:3"
    },
    {
        text: "Perhaps you hate a thing and it is good for you.",
        reference: "Quran 2:216"
    }
];

let currentQuoteIndex = 0;

function updateQuote() {
    const quoteDisplay = document.getElementById('quote-display');
    const quoteReference = document.getElementById('quote-reference');
    
    // Fade out
    quoteDisplay.style.opacity = '0';
    quoteReference.style.opacity = '0';
    
    setTimeout(() => {
        // Update text
        quoteDisplay.textContent = quotes[currentQuoteIndex].text;
        quoteReference.textContent = quotes[currentQuoteIndex].reference;
        
        // Fade in
        quoteDisplay.style.opacity = '1';
        quoteReference.style.opacity = '1';
        
        // Update index
        currentQuoteIndex = (currentQuoteIndex + 1) % quotes.length;
    }, 500);
}

// Start quote rotation when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    updateQuote();
    setInterval(updateQuote, 3000);
});
