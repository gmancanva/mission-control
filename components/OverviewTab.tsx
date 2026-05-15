'use client'

import type { JiraEpic } from '@/lib/jira'
import ProjectCard from './ProjectCard'

type Props = {
  epics: JiraEpic[]
  jiraBaseUrl: string
}

export default function OverviewTab({ epics, jiraBaseUrl }: Props) {
  if (epics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-gray-500">
        <svg className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm">No epics found. Check your Jira config or hit Sync.</p>
      </div>
    )
  }

  // Group by project key prefix
  const grouped = epics.reduce<Record<string, JiraEpic[]>>((acc, epic) => {
    const project = epic.key.split('-')[0]
    if (!acc[project]) acc[project] = []
    acc[project].push(epic)
    return acc
  }, {})

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([project, projectEpics]) => (
        <section key={project}>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-600 dark:text-gray-400">
              {project}
            </h2>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
            <span className="text-sm text-gray-500 dark:text-gray-500">{projectEpics.length} epic{projectEpics.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projectEpics.map((epic) => (
              <ProjectCard key={epic.id} epic={epic} jiraBaseUrl={jiraBaseUrl} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
