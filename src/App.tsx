import { useEffect, useState } from 'react'
import { Background } from '@/components/fx/Background'
import { useWipe } from '@/components/fx/Wipe'
import { CharacterSelect } from '@/screens/CharacterSelect'
import { SheetScreen } from '@/screens/SheetScreen'
import { TitleScreen } from '@/screens/TitleScreen'
import { useRoster } from '@/store/roster'
import type { Character } from '@/types/character'

type Screen = 'title' | 'select' | 'sheet'

export default function App() {
  const { characters, loaded, savedAt, hydrate, addCharacter, removeCharacter, duplicateCharacter, updateCharacter } =
    useRoster()
  const [screen, setScreen] = useState<Screen>('title')
  const [index, setIndex] = useState(0)
  const [activeId, setActiveId] = useState<string | null>(null)
  const { run, overlay } = useWipe()

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const active = characters.find((c) => c.id === activeId) ?? null
  const accent =
    screen === 'title' ? '#e01133' : active?.identity.accent ?? characters[index]?.identity.accent ?? '#e01133'

  const openSheet = (character: Character) => {
    run(character.identity.name, () => {
      setActiveId(character.id)
      setScreen('sheet')
    })
  }

  const backToSelect = () => {
    run('Party', () => {
      setActiveId(null)
      setScreen('select')
    })
  }

  const createCharacter = () => {
    const created = addCharacter()
    setIndex(characters.length)
    openSheet(created)
  }

  return (
    <div style={{ ['--accent' as string]: accent, height: '100%' }}>
      <Background />
      {overlay}

      {screen === 'title' && (
        <TitleScreen onStart={() => run('Arcana', () => setScreen('select'))} />
      )}

      {screen === 'select' && loaded && (
        <CharacterSelect
          characters={characters}
          index={Math.min(index, Math.max(0, characters.length - 1))}
          onIndexChange={setIndex}
          onOpen={openSheet}
          onCreate={createCharacter}
          onDelete={(character) => {
            removeCharacter(character.id)
            setIndex((i) => Math.max(0, Math.min(i, characters.length - 2)))
          }}
          onDuplicate={(character) => duplicateCharacter(character.id)}
        />
      )}

      {screen === 'sheet' && active && (
        <SheetScreen
          key={active.id}
          character={active}
          savedAt={savedAt}
          update={(recipe) => updateCharacter(active.id, recipe)}
          onExit={backToSelect}
        />
      )}
    </div>
  )
}
