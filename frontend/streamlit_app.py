import streamlit as st
import sys
from pathlib import Path

# Put the repo root on sys.path so `from frontend.views import ...` resolves
# regardless of the directory streamlit was launched from.
sys.path.insert(0, str(Path(__file__).parent.parent))

# Configure page
st.set_page_config(
    page_title="ResumeLens ATS",
    page_icon=None,
    layout="wide",
    initial_sidebar_state="auto"
)

# Auth state. Populated by Supabase sign-in / sign-up / OAuth.
# All four are None when signed out, all four are set when signed in.
for key, default in [
    ("access_token", None),
    ("refresh_token", None),
    ("user_id", None),       # Supabase auth user id (uuid); also used by api_client
    ("user_email", None),
    ("auth_error", None),
    ("auth_info", None),
]:
    if key not in st.session_state:
        st.session_state[key] = default

# If we just came back from Google OAuth, Supabase appends `?code=<authcode>`
# to the redirect URL. Exchange it for a session before rendering anything.
if (
    not st.session_state.access_token
    and "code" in st.query_params
):
    from frontend.services import supabase_client
    result = supabase_client.exchange_code_for_session(st.query_params["code"])

    #Always clear the ?code= param so a refresh doesn't try to re-exchange.
    st.query_params.clear()
    if "error" in result:
        st.session_state.auth_error = f"Google sign-in failed: {result['error']}"
    else:
        st.session_state.access_token  = result["access_token"]
        st.session_state.refresh_token = result["refresh_token"]
        st.session_state.user_id       = result["user_id"]
        st.session_state.user_email    = result["email"]
        st.rerun()

#Load custom CSS
def load_css():
    try:
        css_path = Path(__file__).parent / 'assets' / 'styles.css'
        with open(css_path, 'r') as f:
            return f'<style>{f.read()}</style>'
    except FileNotFoundError:
        return ''

st.markdown(load_css(), unsafe_allow_html=True)

# Initialize session state for view management
if 'current_view' not in st.session_state:
    st.session_state.current_view = 'landing'


def _nav_button(label: str, view: str, icon: str) -> None:
    """Render a sidebar navigation button with an active state."""
    is_active = st.session_state.current_view == view
    if st.button(
        label,
        key=f"nav_{view}",
        use_container_width=True,
        type="primary" if is_active else "tertiary",
        icon=icon,
    ):
        st.session_state.current_view = (
            "auth" if view in {"scorer", "history"} and not st.session_state.access_token else view
        )
        if st.session_state.current_view == "auth":
            st.session_state.auth_return_view = view
        st.rerun()


# Sidebar navigation
with st.sidebar:
    st.markdown(
        """
        <div class="sidebar-brand">
            <div class="brand-mark">
                <span>RL</span>
            </div>
            <div>
                <div class="brand-name">ResumeLens</div>
                <div class="brand-subtitle">ATS dashboard</div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    st.markdown('<div class="sidebar-section-label">Workspace</div>', unsafe_allow_html=True)

    _nav_button("Home", "landing", ":material/home:")
    _nav_button("Analyzer", "scorer", ":material/analytics:")
    _nav_button("History", "history", ":material/history:")
    _nav_button("Resources", "resources", ":material/menu_book:")

    st.markdown(
        """
        <div class="sidebar-status-card">
            <div class="status-orb"></div>
            <p>Local analysis workspace</p>
            <strong>Groq, PDF export, and fallback history are ready.</strong>
        </div>
        """,
        unsafe_allow_html=True,
    )


# Protected views always pass through the same authentication route.
if (
    st.session_state.current_view in {"scorer", "history"}
    and not st.session_state.access_token
):
    st.session_state.auth_return_view = st.session_state.current_view
    st.session_state.current_view = "auth"

# Main content area - render based on current view
if st.session_state.current_view == 'landing':
    # Import and render landing page
    from frontend.views import landing
    landing.render()

elif st.session_state.current_view == 'scorer':
    # Import and render scorer page
    from frontend.views import scorer
    scorer.render()

elif st.session_state.current_view == 'history':
    # Import and render history page
    from frontend.views import history
    history.render()

elif st.session_state.current_view == 'resources':
    # Import and render resources page
    from frontend.views import resources
    resources.render()

elif st.session_state.current_view == 'auth':
    from frontend.views import auth
    auth.render()
