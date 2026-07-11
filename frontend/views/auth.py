import streamlit as st

from frontend.services import supabase_client


def _complete_auth(result: dict) -> None:
    st.session_state.access_token = result["access_token"]
    st.session_state.refresh_token = result["refresh_token"]
    st.session_state.user_id = result["user_id"]
    st.session_state.user_email = result["email"]
    st.session_state.current_view = st.session_state.pop("auth_return_view", "landing")


def render() -> None:
    st.html(
        """
        <section class="auth-heading">
            <div class="auth-brand-mark">RL</div>
            <div class="eyebrow">ResumeLens account</div>
            <h1>Sign in to continue</h1>
            <p>Your reports and analysis history stay connected to your account.</p>
        </section>
        """
    )

    _, center, _ = st.columns([1.15, 1, 1.15])
    with center:
        if st.button("Back to home", icon=":material/arrow_back:", type="tertiary"):
            st.session_state.current_view = "landing"
            st.rerun()

        if st.session_state.auth_error:
            st.error(st.session_state.auth_error)
            st.session_state.auth_error = None
        if st.session_state.auth_info:
            st.info(st.session_state.auth_info)
            st.session_state.auth_info = None

        tab_in, tab_up = st.tabs(["Sign in", "Create account"])
        with tab_in:
            with st.form("signin_form", clear_on_submit=False):
                email = st.text_input("Email", key="signin_email")
                password = st.text_input("Password", type="password", key="signin_pw")
                submitted = st.form_submit_button("Sign in", use_container_width=True)
            if submitted:
                result = supabase_client.sign_in_with_password(email, password)
                if "error" in result:
                    st.session_state.auth_error = result["error"]
                else:
                    _complete_auth(result)
                st.rerun()

        with tab_up:
            with st.form("signup_form", clear_on_submit=False):
                email_up = st.text_input("Email", key="signup_email")
                password_up = st.text_input(
                    "Password (min 6 characters)", type="password", key="signup_pw"
                )
                submitted_up = st.form_submit_button("Create account", use_container_width=True)
            if submitted_up:
                result = supabase_client.sign_up_with_password(email_up, password_up)
                if "error" in result:
                    st.session_state.auth_error = result["error"]
                elif result.get("pending_confirmation"):
                    st.session_state.auth_info = (
                        f"Check your inbox. A confirmation email was sent to {result['email']}."
                    )
                else:
                    _complete_auth(result)
                st.rerun()

        st.html('<div class="auth-divider"><span>or</span></div>')
        oauth = supabase_client.google_oauth_url()
        if "error" in oauth:
            st.caption(f"Google sign-in unavailable: {oauth['error']}")
        else:
            st.link_button("Continue with Google", oauth["url"], use_container_width=True)
