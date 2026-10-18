import React from 'react'

const Section = ({title, children}:{title:string, children:React.ReactNode})=> (
  <section className="card mb-6">
    <h2 className="text-lg font-semibold mb-2">{title}</h2>
    <div className="text-sm text-gray-700">{children}</div>
  </section>
)

export default function Dashboard(){
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Section title="College Counselling">
        Personalized counselling, document checklists, and mock interviews to help students apply to the right colleges.
      </Section>

      <Section title="Government Certificates">
        Guided workflows to obtain or request certified copies of birth, caste, and other official documents.
      </Section>

      <Section title="Scholarships">
        Browse scholarship opportunities, eligibility checks, and step-by-step application tracking.
      </Section>
    </div>
  )
}
