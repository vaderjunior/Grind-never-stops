let app_name = "VadersApp"
var app_version = 1.0
console.log(app_name)
console.log("Yaay")
console.log(app_version==1.0)
console.log(app_version === "1.0")
check()

function check() {
    if (app_version == 1.0){
        console.log(`Version is ${app_version}`)
    }
    else if (app_version == 2.0){
        console.log(`Version is ${app_version}`)
    }
    else {
        console.log(`Version is not 1.0 or 2.0, it is ${app_version}`)
    }
}