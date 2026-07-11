import streamlit as st


def render():
    """Render the resources page"""
    
    st.markdown(
        """
        <div class="page-heading">
            <div class="eyebrow">Resources</div>
            <h1>ATS resume standards</h1>
            <p>Practical guidance for building resumes that parse cleanly and match role requirements.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    
    # ATS Tips
    st.markdown("## ATS optimization checklist")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        ### Do
        - Use standard section headings
        - Include relevant keywords from job description
        - Use simple, clean formatting
        - List skills explicitly
        - Quantify achievements with numbers
        - Use standard fonts (Arial, Calibri, Times New Roman)
        - Save as PDF or DOCX
        """)
    
    with col2:
        st.markdown("""
        ### Avoid
        - Avoid tables and text boxes
        - Don't use headers/footers for important info
        - Avoid images and graphics
        - Don't use unusual fonts
        - Avoid columns (use single column layout)
        - Don't keyword stuff
        - Avoid abbreviations without spelling out first
        """)
    
    st.markdown("---")
    
    # Common ATS Keywords
    st.markdown("## Common ATS keywords by industry")
    
    tab1, tab2, tab3 = st.tabs(["Technology", "Business", "Creative"])
    
    with tab1:
        st.markdown("""
        **Software Development:**
        - Programming languages (Python, Java, JavaScript)
        - Frameworks (React, Django, Spring)
        - Tools (Git, Docker, Kubernetes)
        - Methodologies (Agile, Scrum, CI/CD)
        """)
    
    with tab2:
        st.markdown("""
        **Business & Management:**
        - Project management
        - Stakeholder engagement
        - Budget management
        - Strategic planning
        - Team leadership
        """)
    
    with tab3:
        st.markdown("""
        **Creative & Design:**
        - Adobe Creative Suite
        - UI/UX Design
        - Wireframing & Prototyping
        - Brand identity
        - Visual communication
        """)
    
    st.markdown("---")
    
    # Resume Templates
    st.markdown("## ATS-friendly resume templates")
    st.info("Coming soon: Downloadable ATS-optimized resume templates")
