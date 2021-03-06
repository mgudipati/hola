import Expo from 'expo'
import React, { Component } from 'react'
import { View, FlatList, SafeAreaView, StyleSheet, Dimensions } from 'react-native'
import PropTypes from 'prop-types'
import firebase from 'firebase'
import 'firebase/firestore'
import GeoFire from 'geofire'
import { connect } from 'react-redux'
import { ListItem, SearchBar, Avatar } from 'react-native-elements'

import { setProfiles } from '../actions/user'
import Swiper from '../components/swiper'
import Profile from '../screens/profile'
import withPresence from '../components/withPresence'

const AvatarWithPresence = withPresence(View)

const { width, height } = Dimensions.get('window')

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'white',
    width,
    height,
  },
  indicator: {
    position: 'absolute',
    left: '80%',
    bottom: '20%',
    width: 10,
    height: 10,
    borderColor: 'white',
    borderWidth: 2,
    borderRadius: 5,
    backgroundColor: 'blue',
  },
})

class Home extends Component {
  static propTypes = {
    dispatch: PropTypes.func,
    profiles: PropTypes.array,
    user: PropTypes.object,
    navigation: PropTypes.object,
  }

  state = {
    data: null,
    online: [],
    text: '',
  }

  componentDidMount() {
    const { uid } = this.props.user
    this.updateUserLocation(uid)
    this.getProfiles(uid)
    this.getPresence()
  }

  onChangeText = (text) => {
    const filtered = this.props.profiles.filter((item) => {
      const textData = text.toUpperCase()
      const itemData = item.name.toUpperCase()
      return itemData.indexOf(textData) > -1
    })
    this.setState({ data: filtered, text })
  }

  getProfiles = (uid) => {
    firebase
      .firestore()
      .collection('users')
      .onSnapshot((snapshot) => {
        const profiles = []
        snapshot.forEach((doc) => {
          if (doc.id !== uid) {
            profiles.push(doc.data())
          }
        })
        this.props.dispatch(setProfiles(profiles))
        this.setState({ data: this.props.profiles })
      })
  }

  getPresence = () => {
    firebase
      .database()
      .ref()
      .child('presence')
      .on('value', (snapshot) => {
        const uids = []
        snapshot.forEach((user) => {
          if (user.val() === true) {
            // user is online
            uids.push(user.key)
          }
        })
        this.setState({ online: uids })
      })
  }

  updateUser = (uid, key, value) => {
    firebase
      .database()
      .ref('users')
      .child(uid)
      .update({ [key]: value })
  }

  updateUserLocation = async (uid) => {
    const { Permissions, Location } = Expo
    const { status } = await Permissions.askAsync(Permissions.LOCATION)
    if (status === 'granted') {
      const location = await Location.getCurrentPositionAsync({ enableHighAccuracy: false })
      const { latitude, longitude } = location.coords
      const geoFireRef = new GeoFire(firebase.database().ref('geoData'))
      geoFireRef.set(uid, [latitude, longitude])
    }
  }

  renderItem = ({ item }) => (
    <ListItem
      key={item.id}
      containerStyle={{ borderBottomWidth: 0 }}
      roundAvatar
      avatar={
        <AvatarWithPresence isOnline={this.state.online.includes(item.uid)}>
          <Avatar rounded source={item.picture && { uri: item.picture }} />
        </AvatarWithPresence>
      }
      title={item.name}
      titleStyle={{ fontSize: 18 }}
      subtitle={item.email}
      subtitleStyle={{ fontSize: 12, color: 'darkgrey' }}
      onPress={() => {
        this.props.navigation.navigate('Chat', { user: this.props.user, profile: item })
      }}
      rightIcon={{ name: 'map' }}
      onPressRightIcon={() => {
        this.props.navigation.navigate('Map', { profile: item })
      }}
    />
  )

  renderSeparator = () => (
    <View
      style={{
        height: 1,
        width: '75%',
        backgroundColor: 'lightgrey',
        marginLeft: '15%',
        marginRight: '10%',
      }}
    />
  )

  renderHeader = () => (
    <SearchBar
      onChangeText={this.onChangeText}
      placeholder="Search..."
      lightTheme
      round
      value={this.state.text}
    />
  )

  render() {
    return (
      <SafeAreaView>
        <Swiper>
          <View style={styles.screen}>
            <Profile />
          </View>
          <View style={styles.screen}>
            <FlatList
              data={this.state.data}
              extraData={this.state.online}
              renderItem={this.renderItem}
              ItemSeparatorComponent={this.renderSeparator}
              ListHeaderComponent={this.renderHeader}
              keyExtractor={item => item.id}
            />
          </View>
        </Swiper>
      </SafeAreaView>
    )
  }
}

const mapStateToProps = state => ({
  profiles: state.user.profiles,
  user: state.user.user,
})

export default connect(mapStateToProps)(Home)
