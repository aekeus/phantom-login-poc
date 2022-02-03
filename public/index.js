window.onload = () => {
  // check for the existance of the Solana wallet
  if (!window.solana) {
    document.getElementById("controls").innerHTML = "window.solana does not exist"
    return
  }

  let pub_key = null
  const connectButton = document.getElementById('connect');
  connectButton.addEventListener('click', async ()=>{
    const results = await window.solana.connect()
    if (results.publicKey) {
      document.getElementById("pubkey").innerHTML = results.publicKey
      pub_key = results.publicKey
      const signupResults = await fetch('/auth/connect', {
        headers: {
          "content-type": "application/json"
        },
        method: 'PUT',
        body: JSON.stringify({
          pub_key: results.publicKey.toString()
        })
      });
    } else console.log('error ', results)
  });
  const loginButton = document.getElementById('login')
  loginButton.addEventListener('click', async ()=>{
    const nonceResults = await fetch('/auth/nonce?pub_key=' + pub_key)
    const nonce = (await nonceResults.json()).nonce
    const encodedMessage = new TextEncoder().encode(nonce)
    let signedMessage = null
    try {
      signedMessage = await window.solana.signMessage(encodedMessage, "utf8")
    } catch (err) {
      document.getElementById('login-text').innerHTML = "Login cancelled"
    }
    const loginResults = await fetch('/auth/login', {
      method: 'post',
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        pub_key: signedMessage.publicKey.toString(),
        signature: signedMessage.signature
      })
    })
    if (loginResults.status === 200) {
      document.getElementById('login-text').innerHTML = "Login successful, check sessionId cookie"
    }
  })
  const apiButton = document.getElementById('api')
  apiButton.addEventListener('click', async ()=>{
    const results = await fetch('/api/1/test', {
      method: 'get',
      headers: {
        "content-type": "application/json"
      },
    })
    document.getElementById('api-text').innerHTML = results.status
  })
}
