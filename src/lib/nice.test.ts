import { describe, expect, it } from 'vitest'
import { heavyNews, nextNice, nicePictures, pickNice } from './nice'
import { story } from '../test/fixtures'

const picture = (key: string, extra = {}) => story({ key, title: key, media: [{ kind: 'image', thumb: '/icon-512.png', alt: 'A cat' }], ...extra })

describe('something nice', () => {
  it('picks the first picture', () => {
    expect(pickNice([story({ key: 'words' }), picture('a'), picture('b')])?.key).toBe('a')
  })

  it('never picks anything behind a warning, or a video', () => {
    const video = story({ key: 'v', media: [{ kind: 'video', thumb: '/icon-512.png' }] })
    expect(pickNice([picture('warned', { warning: 'Graphic' }), video, picture('ok')])?.key).toBe('ok')
    expect(pickNice([picture('warned', { warning: 'Graphic' })])).toBeUndefined()
  })

  it('goes round every picture on Another, again and again', () => {
    const stories = [picture('a'), story({ key: 'words' }), picture('b'), picture('c')]
    const shown = ['a']
    for (let i = 0; i < 6; i++) shown.push(nextNice(stories, shown[shown.length - 1])!.key)
    expect(shown).toEqual(['a', 'b', 'c', 'a', 'b', 'c', 'a'])
    expect(nextNice(stories, 'gone')?.key).toBe('a')
    expect(nicePictures([...stories, picture('d', { warning: 'Graphic' })]).map((s) => s.key)).toEqual(['a', 'b', 'c'])
  })

  it('knows heavy news when it sees it', () => {
    expect(heavyNews(['world-news'])).toBe(true)
    expect(heavyNews(['politics-uk', 'space'])).toBe(true)
    expect(heavyNews(['space', 'humour'])).toBe(false)
  })
})
