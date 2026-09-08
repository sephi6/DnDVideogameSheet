import { useEffect, useState } from 'react'
import { Background } from '@/components/fx/Background'
import { useWipe } from '@/components/fx/Wipe'
import { CharacterSelect } from '@/screens/CharacterSelect'
import { LoginScreen } from '@/screens/LoginScreen'
import { SheetScreen } from '@/screens/SheetScreen'
import { TitleScreen } from '@/screens/TitleScreen'
import { useAuth } from '@/store/auth'
import { useRoster } from '@/store/roster'
import type { Character } from '@/types/character'

type Screen = 'title' | 'select' | 'sheet'

export default function App() {
  const {
    characters, loaded, sync, syncError, pendingLocalImport,
    hydrate, reset, addCharacter, removeCharacter, duplicateCharacter, updateCharacter,
    seedDemo, importLocalRoster, retryFailed,
  } = useRoster()
  const { status: authStatus, user, init: initAuth, signOut } = useAuth()
  const [screen, setScreen] = useState<Screen>('title')
  const [index, setIndex] = useState(0)
  const [activeId, setActiveId] = useState<string | null>(null)
  const { run, overlay } = useWipe()

  useEffect(() => initAuth(), [initAuth])

  // Sheets are read as soon as there is something to read from: without
  // Supabase, right at start-up; with Supabase, on sign-in. On sign-out, cleared.
  useEffect(() => {
    if (authStatus === 'disabled' || authStatus === 'signed-in') {
      void hydrate()
    } else if (authStatus === 'signed-out') {
      reset()
      setScreen((current) => (current === 'sheet' ? 'title' : current))
      setActiveId(null)
    }
  }, [authStatus, hydrate, reset])

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

  const needsLogin = authStatus !== 'disabled' && authStatus !== 'signed-in'

  return (
    <div style={{ ['--accent' as string]: accent, height: '100%' }}>
      <Background />
      {overlay}

      {screen === 'title' && <TitleScreen onStart={() => run('Arcana', () => setScreen('select'))} />}

      {screen !== 'title' && needsLogin && (
        authStatus === 'loading' ? <div className="center" style={{ height: '100%' }}>
          <span className="label">Checking session…</span>
        </div> : <LoginScreen />
      )}

      {screen === 'select' && !needsLogin && loaded && (
        <CharacterSelect
          characters={characters}
          index={Math.min(index, Math.max(0, characters.length - 1))}
          onIndexChange={setIndex}
          onOpen={openSheet}
          onCreate={createCharacter}
          onDelete={(character) => {
            void removeCharacter(character.id)
            setIndex((i) => Math.max(0, Math.min(i, characters.length - 2)))
          }}
          onDuplicate={(character) => duplicateCharacter(character.id)}
          userEmail={user?.email ?? null}
          onSignOut={() => {
            run('See you', () => {
              void signOut()
              setScreen('title')
            })
          }}
          pendingLocalImport={pendingLocalImport}
          onImportLocal={() => void importLocalRoster()}
          onSeedDemo={() => void seedDemo()}
        />
      )}

      {screen === 'sheet' && !needsLogin && active && (
        <SheetScreen
          key={active.id}
          character={active}
          sync={sync}
          syncError={syncError}
          onRetry={() => void retryFailed()}
          update={(recipe) => updateCharacter(active.id, recipe)}
          onExit={backToSelect}
        />
      )}
    </div>
  )
}
