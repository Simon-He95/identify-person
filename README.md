# identify-person
抓取video中的人像与其他颜色的背景合成新的图片

## Install
```
  npm i -g @simon_he/identify-person
```

## Usage
```
  import identifyPerson from '@simon_he/identify-person'
  const { changeColor } = await identifyPerson(video, canvas, (base64) => {
    console.log(base64)
  })
  changeColor('red')
```

## License
MIT

# Powered by
- [tensorflow.js](https://github.com/tensorflow/tfjs-models)

## :coffee: 
<a href="https://github.com/Simon-He95/sponsor" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" style="height: 51px !important;width: 217px !important;" ></a>

<span><div align="center">![sponsors](https://www.hejian.club/images/sponsors.jpg)</div></span>

