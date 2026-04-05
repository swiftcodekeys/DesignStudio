import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import heroImg from './assets/hero-gate.jpg';

/* ---- SVG Icons ---- */
var DesignIcon = function() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
    );
};

var MapIcon = function() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
    );
};

var PriceIcon = function() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    );
};

var StarIcon = function() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    );
};

var CheckIcon = function() {
    return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="14" height="14">
            <polyline points="3 8 7 12 13 4" />
        </svg>
    );
};

/* ---- Testimonials ---- */
var TESTIMONIALS = [
    {
        quote: 'The configurator made it so easy to visualize exactly what I wanted.',
        name: 'Sarah M.',
        location: 'Grand Rapids, MI',
    },
    {
        quote: 'I could see the fence on my property before ordering. No surprises.',
        name: 'James T.',
        location: 'Traverse City, MI',
    },
    {
        quote: 'Got my quote in minutes. The whole process was incredibly smooth.',
        name: 'Michelle R.',
        location: 'Holland, MI',
    },
];

/* ---- IntersectionObserver hook ---- */
function useInView(options) {
    var ref = useRef(null);
    var visibleState = useState(false);
    var visible = visibleState[0];
    var setVisible = visibleState[1];

    useEffect(function() {
        var el = ref.current;
        if (!el) return;
        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.unobserve(entry.target);
                }
            });
        }, options || { threshold: 0.15 });
        observer.observe(el);
        return function() { observer.disconnect(); };
    }, []);

    return [ref, visible];
}

/* ============================================================
   LANDING PAGE
   ============================================================ */
var LandingPage = function() {
    var navigate = useNavigate();
    var ctaRef = useRef(null);
    var testimonialState = useState(0);
    var activeTestimonial = testimonialState[0];
    var setActiveTestimonial = testimonialState[1];

    // Check for saved config
    var hasSavedConfig = false;
    try {
        var raw = localStorage.getItem('gv_config');
        if (raw) {
            var parsed = JSON.parse(raw);
            if (parsed && parsed.styleId) hasSavedConfig = true;
        }
    } catch (e) { /* */ }

    // Pulse CTA button once after 2 seconds
    useEffect(function() {
        var timer = setTimeout(function() {
            if (ctaRef.current) {
                ctaRef.current.classList.add('pulse');
                ctaRef.current.addEventListener('animationend', function() {
                    ctaRef.current.classList.remove('pulse');
                }, { once: true });
            }
        }, 2000);
        return function() { clearTimeout(timer); };
    }, []);

    // Rotate testimonials
    useEffect(function() {
        var interval = setInterval(function() {
            setActiveTestimonial(function(prev) {
                return (prev + 1) % TESTIMONIALS.length;
            });
        }, 5000);
        return function() { clearInterval(interval); };
    }, []);

    // IntersectionObserver refs
    var stepsResult = useInView({ threshold: 0.1 });
    var stepsRef = stepsResult[0];
    var stepsVisible = stepsResult[1];

    var proofResult = useInView({ threshold: 0.2 });
    var proofRef = proofResult[0];
    var proofVisible = proofResult[1];

    var finalResult = useInView({ threshold: 0.2 });
    var finalRef = finalResult[0];
    var finalVisible = finalResult[1];

    var handleStartDesigning = function() {
        navigate('/wizard');
    };

    var handleSkipToQuote = function() {
        navigate('/studio');
    };

    var handleContinue = function() {
        navigate('/studio');
    };

    return (
        <div className="landing-page">
            {/* ---- SECTION 1: HERO ---- */}
            <section className="hero">
                <div className="hero-bg" style={{ backgroundImage: 'url(' + heroImg + ')' }} />
                <div className="hero-overlay" />

                <div className="hero-topbar">
                    <div className="hero-logo-group">
                        <img src="assets/logo-white.png" alt="Grandview Fence" className="hero-logo-img" />
                        <div className="hero-logo-text">
                            <span className="hero-logo-brand">Grandview Fence</span>
                            <span className="hero-logo-sub">Design Studio</span>
                        </div>
                    </div>
                    <a href="tel:8553362330" className="hero-phone">(855) FENCE-30</a>
                </div>

                <div className="hero-content">
                    <h1 className="hero-headline">
                        Design your fence.<br />
                        Get an instant price.
                    </h1>
                    <p className="hero-subhead">
                        Configure in 3D, measure your property, and order online
                        or talk to an expert. Takes about 3 minutes.
                    </p>
                    <div className="hero-cta-row">
                        <button
                            ref={ctaRef}
                            className="hero-cta-primary"
                            onClick={handleStartDesigning}
                        >
                            Start Designing &rarr;
                        </button>
                        {hasSavedConfig && (
                            <button className="hero-cta-continue" onClick={handleContinue}>
                                Continue Design &rarr;
                            </button>
                        )}
                    </div>
                    <button className="hero-secondary-link" onClick={handleSkipToQuote}>
                        Already know what you want? Skip to quote &rarr;
                    </button>
                </div>

                <div className="hero-trust-strip">
                    <span><CheckIcon /> Veteran-Owned</span>
                    <span className="trust-sep">|</span>
                    <span><CheckIcon /> Made in the USA</span>
                    <span className="trust-sep">|</span>
                    <span><CheckIcon /> AAMA 2604 Certified</span>
                    <span className="trust-sep">|</span>
                    <span><CheckIcon /> Lifetime Warranty</span>
                    <span className="trust-sep">|</span>
                    <span><CheckIcon /> <a href="tel:8553362330" style={{ color: 'inherit', textDecoration: 'none' }}>(855) FENCE-30</a></span>
                </div>
            </section>

            {/* ---- SECTION 2: HOW IT WORKS ---- */}
            <section className="how-it-works">
                <div className="how-it-works-inner">
                    <h2 className="section-heading">From idea to order in minutes</h2>
                    <div className="steps-row" ref={stepsRef}>
                        <div className={'step-card' + (stepsVisible ? ' visible' : '')} style={{ transitionDelay: '0ms' }}>
                            <span className="step-number">01</span>
                            <div className="step-icon"><DesignIcon /></div>
                            <h3 className="step-heading">Design in 3D</h3>
                            <p className="step-body">
                                Choose your fence style, height, and color.
                                See it rendered in real time before you buy.
                            </p>
                        </div>
                        <div className={'step-card' + (stepsVisible ? ' visible' : '')} style={{ transitionDelay: '150ms' }}>
                            <span className="step-number">02</span>
                            <div className="step-icon"><MapIcon /></div>
                            <h3 className="step-heading">Measure your property</h3>
                            <p className="step-body">
                                Draw your fence line on a satellite map or
                                enter your measurements manually.
                            </p>
                        </div>
                        <div className={'step-card' + (stepsVisible ? ' visible' : '')} style={{ transitionDelay: '300ms' }}>
                            <span className="step-number">03</span>
                            <div className="step-icon"><PriceIcon /></div>
                            <h3 className="step-heading">Get your instant price</h3>
                            <p className="step-body">
                                See a full itemized quote with real pricing.
                                Order online or schedule a free consultation.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Social proof section removed — add back when reviews and certs are ready */}

            {/* ---- SECTION 4: FINAL CTA ---- */}
            <section className="final-cta">
                <div className={'final-cta-inner' + (finalVisible ? ' visible' : '')} ref={finalRef}>
                    <h2 className="final-headline">
                        Ready to see what your fence will look like?
                    </h2>
                    <p className="final-subhead">
                        No commitment. No contractor visit.
                        Just your design and your price, right now.
                    </p>
                    <button className="final-cta-button" onClick={handleStartDesigning}>
                        Start Designing &rarr;
                    </button>
                    <p className="final-phone">
                        Or call <a href="tel:8553362330">(855) FENCE-30</a> to talk to an expert
                    </p>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
