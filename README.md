# Tip2Tail Ltd - Lambda Resize Tool

This tool was developed to create image thumbnails automatically when a photo is uploaded to AWS S3.  ACL permissions on the uploaded object will be replicated on the created resized objects.

In it's current form this tool will create 4 resized images:
* Square image: `150x150 pixels`
* Square image: `250x250 pixels`
* Square image: `400x400 pixels`
* Resized image: `1024 pixels along longest edge`

## Parameters

The following parameters can be used to configure the tool:
* `BaseS3Bucket`: The base name for the S3 buckets.  `uploads` and `photos` are prefixed to this.  Default: `.tip2tail.scot`.

* `LambdaS3Bucket`: The name of the S3 bucket that contains the source code of the resize lambda function.  Default: `lambda.tip2tail.scot`.

* `LambdaS3Key`: The filename of your source code .zip file.  Default: `t2t-lambda-resize.zip`.

* `DebugModeEnvVar`: Set this to TRUE to enable debug logging on the AWS platform.  Default: `FALSE`.

## Build The Tool

Use the following command at your command prompt/terminal to build the ZIP file prior to deploy.

`gulp zip`

## Upload The Tool

Upload the file `dist/t2t-lambda-resize.zip` to your lambda code bucket.  This is only needed once (multiple instances can share the same code bundle).

## Deploy The Tool

To deploy we can use the `AWS CLI` and the included CloudFormation script.

### Basic Deploy

This will create a CloudFormation stack called `t2t-lambda-resize` and use the default parameter values.

`aws cloudformation create-stack --stack-name t2t-lambda-resize --template-body file://deploy.json --capabilities CAPABILITY_IAM`

### Customising the parameters

The following command will create a stack called `my-lambda-resize` and use custom values for some of the parameters.  Debug loging will be enabled as well.

`aws cloudformation create-stack --stack-name my-lambda-resize --template-body file://deploy.json --capabilities CAPABILITY_IAM --parameters ParameterKey=BaseS3Bucket,ParameterValue=.mywebsite.com ParameterKey=LambdaS3Bucket,ParameterValue=lambda-bucket.mywebsite.com ParameterKey=DebugModeEnvVar,ParameterValue=TRUE`

## Issues

This tool is provided as-is with no warranties expressed or implied.  We welcome all contributions and issues to be logged via GitHub.

## License

    MIT License

    Copyright (c) 2017 tip2tail Ltd

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:
    
    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.