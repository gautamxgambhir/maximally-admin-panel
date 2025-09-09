import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, FileText, Lightbulb, Users, Zap } from 'lucide-react'

interface BlogTemplatesProps {
  onSelectTemplate: (content: string, title: string) => void
  onClose: () => void
}

export function BlogTemplates({ onSelectTemplate, onClose }: BlogTemplatesProps) {
  const templates = [
    {
      id: 'tutorial',
      icon: FileText,
      title: 'Tutorial/How-To',
      description: 'Perfect for step-by-step guides and tutorials',
      content: `# How to [Topic Title]

## Introduction

Brief introduction explaining what readers will learn and why it's important.

## Prerequisites

Before you start, make sure you have:

- Prerequisite 1
- Prerequisite 2
- Prerequisite 3

## Step 1: [First Step Title]

Detailed explanation of the first step.

\`\`\`javascript
// Code example if applicable
console.log('Hello World');
\`\`\`

## Step 2: [Second Step Title]

Detailed explanation of the second step.

## Step 3: [Third Step Title]

Continue with more steps as needed.

## Troubleshooting

Common issues and solutions:

- **Issue 1:** Solution explanation
- **Issue 2:** Solution explanation

## Conclusion

Summarize what was accomplished and next steps.

## Resources

- [Resource 1](url)
- [Resource 2](url)
- [Resource 3](url)`
    },
    {
      id: 'announcement',
      icon: Zap,
      title: 'Announcement',
      description: 'Great for product launches, updates, and news',
      content: `# [Exciting Announcement Title]

We're thrilled to announce [brief description of announcement]!

## What's New?

### Feature/Update 1
Description of the first major point.

### Feature/Update 2
Description of the second major point.

### Feature/Update 3
Description of the third major point.

## Why This Matters

Explain the impact and benefits for your audience:

- **Benefit 1:** How it helps users
- **Benefit 2:** What problems it solves
- **Benefit 3:** Future possibilities

## What's Next?

Outline next steps or call-to-action:

1. **Immediate action:** What users can do right now
2. **Coming soon:** What to expect in the future
3. **Get involved:** How users can participate or learn more

## Get Started

**Ready to dive in?** [Call-to-action link]

---

*Stay tuned for more updates, and don't hesitate to reach out with any questions!*`
    },
    {
      id: 'thought-leadership',
      icon: Lightbulb,
      title: 'Thought Leadership',
      description: 'Share insights, opinions, and industry perspectives',
      content: `# [Thought-Provoking Title]

*[Optional subtitle or key takeaway]*

## The Current Landscape

Brief overview of the current state of the topic/industry.

> "Relevant quote or insight that sets the tone"

## The Challenge

Identify the main problem or challenge:

- **Issue 1:** Description
- **Issue 2:** Description  
- **Issue 3:** Description

## A Different Perspective

### Key Insight 1
Your unique viewpoint and reasoning.

### Key Insight 2
Another perspective with supporting evidence.

### Key Insight 3
Additional insights that support your argument.

## What This Means for [Your Audience]

Practical implications:

1. **Short-term impact:** Immediate considerations
2. **Long-term implications:** Future outlook
3. **Action items:** What leaders/professionals should do

## The Path Forward

Recommendations and predictions:

- **Recommendation 1:** Specific action or strategy
- **Recommendation 2:** Another important consideration
- **Recommendation 3:** Future preparation advice

## Conclusion

Wrap up with your key message and call for discussion.

---

*What do you think? Share your thoughts and experiences in the comments below.*`
    },
    {
      id: 'event-recap',
      icon: Users,
      title: 'Event/Hackathon Recap',
      description: 'Perfect for recapping events, competitions, and gatherings',
      content: `# [Event Name] - An Incredible Experience!

*[Event dates and location]*

What an amazing [event type]! Here's everything that happened and why you should be excited about what's coming next.

## Event Overview

### The Numbers
- **Participants:** [number]
- **Duration:** [time period]
- **Projects/Teams:** [if applicable]
- **Prizes:** [if applicable]

### Key Highlights
- Highlight 1
- Highlight 2
- Highlight 3

## Day-by-Day Breakdown

### Day 1: [Theme/Focus]
Key activities and moments from the first day.

### Day 2: [Theme/Focus]
Continued progress and exciting developments.

### Final Day: [Theme/Focus]
Presentations, judging, and results.

## Amazing Projects & Winners

### 🥇 First Place: [Project Name]
Brief description of the winning project and what made it special.

### 🥈 Second Place: [Project Name]  
Description of the second-place project.

### 🥉 Third Place: [Project Name]
Description of the third-place project.

### Special Mentions
Other notable projects or achievements.

## What We Learned

Key takeaways from the event:

- **Learning 1:** Important insight
- **Learning 2:** Another valuable lesson
- **Learning 3:** Future implications

## Thank You!

### Participants
Amazing work from all participants who brought incredible energy and creativity.

### Mentors & Judges
Grateful for the guidance and expertise from our amazing mentors and judges.

### Sponsors & Partners
Special thanks to our sponsors who made this event possible.

## What's Next?

- **Follow-up opportunities:** Next steps for participants
- **Future events:** What to expect going forward
- **Stay connected:** How to remain involved

---

*Missed this event? Don't worry – we'll see you at the next one! [Sign up for updates](link)*`
    }
  ]

  return (
    <Card className="fixed inset-4 z-50 overflow-auto bg-white shadow-2xl border-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold">Choose a Blog Template</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Start with a template to make writing easier. You can customize everything after selecting.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => {
            const IconComponent = template.icon
            return (
              <Card key={template.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-3">
                  <IconComponent className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{template.title}</h3>
                    <p className="text-sm text-gray-600">{template.description}</p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    onSelectTemplate(template.content, template.title.replace(/\[.*?\]/g, '').trim())
                    onClose()
                  }}
                  className="w-full"
                  size="sm"
                >
                  Use This Template
                </Button>
              </Card>
            )
          })}
        </div>
        
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Start Blank
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
