import 'babel-core/register'
import '@babel/polyfill'
import fs from 'fs'
import prompts from 'prompts'
import colors from 'colors'
import { promisify } from 'util'
import fetch from 'node-fetch'

const CDM_CONFIG_FILE_NAME = 'CDM_Launcher.config.json';
const CDM_ARMORY_URL = 'http://armory.theorycraft.fi'

;(async () => {
  const read = promisify(fs.readFile, "utf8")
  const write = promisify(fs.writeFile)
  const unlink = promisify(fs.unlink)

  try {
    await read(CDM_CONFIG_FILE_NAME)
  } catch(err) {
    console.log('Couldn\'t find the config file, it seems that this is your first time...'.green)
    const config = await prompts([{
      type: 'text',
      name: 'path',
      message: 'Please enter path to your World of Warcraft folder',
      validate: value => {
        const valid = fs.existsSync(value.trim())
        if(!valid) {
          console.log("\r\n! (PRO TIP: Drag & drop the folder here..)".yellow)
        }
        return valid
      },
      format: value => value.trim()
    }, {
      type: 'text',
      name: 'account',
      message: 'Account name (inside your WTF folder)',
      format: value => value.toUpperCase()
    },{
      type: 'text',
      name: 'key',
      message: 'Finally enter the API key that you got from our developers on Discord'
    }])
    try {
      await write(CDM_CONFIG_FILE_NAME, JSON.stringify(config))
      console.log(`Wrote config to file "${CDM_CONFIG_FILE_NAME}".`)
    } catch(err) {
      console.error('Failed to write to file.'.red)
    }
  }


  try {
    const buffer = await read(CDM_CONFIG_FILE_NAME)
    const config = JSON.parse(buffer.toString())
    console.log('Found config file...'.green)

    const filePath = `${config.path}/WTF/Account/${config.account}/SavedVariables/VF_RealmPlayersTBC.lua`

    try {
      const lua = await read(filePath)
      const luaString = lua.toString()

      try {
        const response = await fetch(`${CDM_ARMORY_URL}/upload?key=${config.key}`, {
          method: 'POST',
          body: lua.toString()
        }).then(res => {
          if(res.status === 401) {
            throw Error('Unauthorized, check your API key.')
          }
          return res.json()
        })

        if(response.status === 'ok') {
          console.info('Data uploaded successfully! Thank you.'.yellow)

          try {
            unlink(filePath).then(()=> console.info('Lua file pruned.'.green))
          } catch (err) {
            console.error('Couldn\'t prune data file. Check your filesystem permissions.')
          }
        }

      } catch(err) {
        console.error(`Failed to upload LUA data.`.red, err)
      }

    } catch (err) {
      console.info(`Lua file not found from ${filePath}. Probably because it was uploaded recently.`.yellow)
    }

    const exit = await prompts({
      type: 'text',
      message: 'Press any key to exit and launch the game!'
    })

  } catch (err) {
    console.error('Failed to parse config file'.red, err)
  }
})()
