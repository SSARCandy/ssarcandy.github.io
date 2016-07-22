---
title: Setting up OpenCV using Cmake GUI
date: 2016-07-23 00:46:45
tags: cmake
---

1. Download [OpenCV](https://github.com/Itseez/opencv) and [Cmake](https://cmake.org/)
2. Build opencv with cmake
 ![image](https://cloud.githubusercontent.com/assets/6803791/15509036/8ce63dfa-2204-11e6-8f7a-1fc2fa6d7faf.png)
 - Press `configure`, choose `visual studio 2015`, finish
 - Then press `generate`

<!-- more -->

3. Open `OpenCV.sln` under `build/`
4. Build it using `Debug`, `Release`
  ![image](https://cloud.githubusercontent.com/assets/6803791/15509134/03aa71ae-2205-11e6-94be-a1a73a4cd7fe.png)  
  - right click > build
  - switch to `Release` mode and build again

5. [Windows] Setting up environment variable
  - add `<opencv>/bin` into `PATH`
  ![image](https://cloud.githubusercontent.com/assets/6803791/15631796/21429442-25ae-11e6-8022-9e5f6fa8eca0.png)
  - add new env named `OpenCV_DIR`, value as `<opencv>/build` 
  - it may need logout to apply setting, you can check it by `echo %PATH%`, `echo %OpenCV_DIR%`

----

### Build with EXTRA MODULES

1. In step `2. Build opencv with cmake`, press `configure`
2. Set up `OPENCV_EXTRA_MODULES_PATH` to proper path(`<opencv_contrib>/modules`)

![image](https://cloud.githubusercontent.com/assets/6803791/15631765/86d41f4e-25ac-11e6-8e1a-4966d8d42a17.png)

3. Press `configure` again, then `generate`


To see more details instructions, see [opencv_contrib](https://github.com/Itseez/opencv_contrib#how-to-build-opencv-with-extra-modules) README


--- 

### Travis.yml example

```
language:
  - cpp
 
sudo: required
 
compiler:
  - gcc
 
# building opencv is time consuming, caching it is better
cache:
    apt: true
    ccache: true
    directories:
        - opencv-3.1.0
        - opencv_contrib-3.1.0
 
install:
 
  # OpenCV dependencies - Details available at: http://docs.opencv.org/trunk/doc/tutorials/introduction/linux_install/linux_install.html
  - sudo apt-get install -y build-essential
  - sudo apt-get install -y cmake git libgtk2.0-dev pkg-config libavcodec-dev libavformat-dev libswscale-dev
  - sudo apt-get install -y python-dev python-numpy libtbb2 libtbb-dev libjpeg-dev libpng-dev libtiff-dev libjasper-dev libdc1394-22-dev
 
  # Download v3.1.0 .zip file and extract.
  - curl -sL https://github.com/Itseez/opencv/archive/3.1.0.zip > opencv.zip
  - unzip -n opencv.zip > log1
 
  # Download EXTRA MODULES and extract.
  - curl -sL https://github.com/Itseez/opencv_contrib/archive/3.1.0.zip > opencv_contrib.zip
  - unzip -n opencv_contrib.zip > log2
 
  # Create a new 'build' folder.
  - cd opencv-3.1.0
  - mkdir -p build
  - cd build
 
  # if Makefile is cached, then skip cmake opencv
  # Set build instructions for Ubuntu distro.
  - cat Makefile > l1 || cmake -D OPENCV_EXTRA_MODULES_PATH=../../opencv_contrib-3.1.0/modules CMAKE_BUILD_TYPE=RELEASE -D CMAKE_INSTALL_PREFIX=/usr/local -D WITH_TBB=ON -D BUILD_NEW_PYTHON_SUPPORT=ON -D WITH_V4L=ON -D INSTALL_C_EXAMPLES=ON -D INSTALL_PYTHON_EXAMPLES=ON -D BUILD_EXAMPLES=ON -D WITH_QT=ON -D WITH_OPENGL=ON ..
 
  # if Makefile is cached, then skip make opencv
  # Run 'make' with four threads.
  - cat Makefile > l2 ||make -j5 > make_log
 
  # Install to OS.
  - sudo make install
 
  # Add configuration to OpenCV to tell it where the library files are located on the file system (/usr/local/lib)
  - sudo sh -c 'echo "/usr/local/lib" > /etc/ld.so.conf.d/opencv.conf'
 
  - sudo ldconfig
  - echo "OpenCV installed."
 
  # We need to return to the repo "root" folder, so we can then 'cd' into the C++ project folder.
  - cd ../../
  - ls -al
 
script:
  - cmake CMakeLists.txt
  - make
  - "./a.out > log1.txt"
```