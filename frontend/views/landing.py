import streamlit as st

from frontend.services import supabase_client


def render():
    account_copy, account_action = st.columns([4, 1.2], vertical_alignment="center")
    with account_copy:
        if st.session_state.access_token:
            st.markdown(
                f'<div class="home-account"><span>Signed in</span><strong>{st.session_state.user_email}</strong></div>',
                unsafe_allow_html=True,
            )
        else:
            st.markdown(
                '<div class="home-account"><span>Your workspace</span><strong>Sign in to save reports and history</strong></div>',
                unsafe_allow_html=True,
            )
    with account_action:
        if st.session_state.access_token:
            if st.button("Sign out", icon=":material/logout:", use_container_width=True):
                supabase_client.sign_out()
                for key in ("access_token", "refresh_token", "user_id", "user_email"):
                    st.session_state[key] = None
                st.rerun()
        elif st.button("Sign in", icon=":material/login:", use_container_width=True, type="primary"):
            st.session_state.current_view = "auth"
            st.session_state.auth_return_view = "landing"
            st.rerun()

    st.html(
        """
        <section class="home-hero-shell">
            <div class="home-breadcrumb">ResumeLens / ATS resume analyzer</div>
            <div class="home-hero">
                <h1>The resume analyzer that turns applications into interviews</h1>
                <p>
                    Upload a resume, compare it against a role, and get a clean,
                    evidence-based report for ATS fit, keywords, structure, and skill proof.
                </p>
            </div>
        </section>
        """
    )

    left, middle, right = st.columns([1.1, 1, 1.1])
    with middle:
        if st.button(
            "Analyze my resume",
            use_container_width=True,
            type="primary",
            icon=":material/arrow_forward:",
        ):
            st.session_state.current_view = "scorer" if st.session_state.access_token else "auth"
            if not st.session_state.access_token:
                st.session_state.auth_return_view = "scorer"
            st.rerun()

    st.html(
        """
        <section class="builder-stage" aria-label="Animated ATS analysis preview">
            <div class="stage-card builder-card">
                <div class="stage-status">
                    <span class="status-dot"></span>
                    Saved locally
                </div>
                <div class="progress-rail">
                    <div class="progress-step complete">1</div>
                    <div class="progress-step active">2</div>
                    <div class="progress-step">3</div>
                    <div class="progress-step">4</div>
                </div>
                <h2>Tell us what role you want</h2>
                <p>ResumeLens compares your resume against the job description and highlights the gaps that matter.</p>
                <div class="field-grid">
                    <div class="field">
                        <span>Target role</span>
                        <strong>Product analyst</strong>
                    </div>
                    <div class="field">
                        <span>Seniority</span>
                        <strong>Mid level</strong>
                    </div>
                </div>
                <div class="keyword-stream">
                    <span>SQL</span>
                    <span>Experimentation</span>
                    <span>Stakeholder reporting</span>
                    <span>Dashboards</span>
                </div>
            </div>

            <div class="stage-card report-card">
                <div class="report-toolbar">
                    <span>ATS report</span>
                    <label>Sample</label>
                </div>
                <div class="resume-paper">
                    <div class="scan-line"></div>
                    <div class="paper-name">Maya Shah</div>
                    <div class="paper-role">Product analyst</div>
                    <div class="paper-line long"></div>
                    <div class="paper-line"></div>
                    <div class="paper-line medium"></div>
                    <div class="paper-section">
                        <span></span><span></span><span></span>
                    </div>
                </div>
                <div class="loop-panel">
                    <div class="loop-slide slide-one">
                        <span>ATS score</span>
                        <strong>84</strong>
                        <p>Strong structure with role-ready experience.</p>
                    </div>
                    <div class="loop-slide slide-two">
                        <span>Keyword coverage</span>
                        <strong>76%</strong>
                        <p>Missing analytics, funnel, and cohort language.</p>
                    </div>
                    <div class="loop-slide slide-three">
                        <span>Next action</span>
                        <strong>3 fixes</strong>
                        <p>Add metrics, mirror title language, tighten bullets.</p>
                    </div>
                </div>
            </div>
        </section>

        <section class="home-proof-grid">
            <article>
                <span>01</span>
                <h3>Parse cleanly</h3>
                <p>Checks sections, links, formatting, and ATS-readable structure.</p>
            </article>
            <article>
                <span>02</span>
                <h3>Match the role</h3>
                <p>Compares language, required skills, semantic fit, and missing terms.</p>
            </article>
            <article>
                <span>03</span>
                <h3>Export the report</h3>
                <p>Turns the analysis into a polished PDF you can review or share.</p>
            </article>
        </section>
        """
    )
