const IpfsHttpClient = require('ipfs-http-client')
const { urlSource } = IpfsHttpClient
const ipfs = IpfsHttpClient()

for await (const file of ipfs.add(urlSource('http://datochain.com'))) {
  console.log(file)
}
