import { SACRED_STORIES_BY_SLUG } from '../content/sacredStories.js'
import StoryPage from './StoryPage.jsx'
import SunyataLanding from './SunyataLanding.jsx'

export default function StoryRoutePage({ nav, storySlug }) {
  const story = SACRED_STORIES_BY_SLUG[storySlug]

  return story
    ? <StoryPage nav={nav} story={story} />
    : <SunyataLanding />
}
