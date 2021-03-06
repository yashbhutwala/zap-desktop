import React, { Component } from 'react'
import PropTypes from 'prop-types'
import find from 'lodash/find'
import Isvg from 'react-inlinesvg'
import { FaAngleDown, FaCircle, FaRepeat } from 'react-icons/lib/fa'
import { btc } from 'utils'
import plus from 'icons/plus.svg'
import search from 'icons/search.svg'

import Value from 'components/Value'
import SuggestedNodes from './SuggestedNodes'

import styles from './Network.scss'

class Network extends Component {
  constructor(props) {
    super(props)

    this.state = {
      refreshing: false
    }
  }

  render() {
    const {
      channels: {
        searchQuery,
        filterPulldown,
        filter,
        selectedChannel,
        loadingChannelPubkeys,
        closingChannelIds
      },
      currentChannels,
      balance,
      ticker,
      currentTicker,

      nodes,

      fetchChannels,
      openContactsForm,

      nonActiveFilters,
      toggleFilterPulldown,
      changeFilter,

      updateChannelSearchQuery,

      setSelectedChannel,

      closeChannel,

      suggestedNodesProps
    } = this.props

    const refreshClicked = () => {
      // turn the spinner on
      this.setState({ refreshing: true })

      // store event in icon so we dont get an error when react clears it
      const icon = this.repeat.childNodes

      // fetch channels
      fetchChannels()

      // wait for the svg to appear as child
      const svgTimeout = setTimeout(() => {
        if (icon[0].tagName === 'svg') {
          // spin icon for 1 sec
          icon[0].style.animation = 'spin 1000ms linear 1'
          clearTimeout(svgTimeout)
        }
      }, 1)

      // clear animation after the second so we can reuse it
      const refreshTimeout = setTimeout(() => {
        icon[0].style.animation = ''
        this.setState({ refreshing: false })
        clearTimeout(refreshTimeout)
      }, 1000)
    }

    // when the user clicks the action to close the channel
    const removeClicked = (channel) => {
      closeChannel({ channel_point: channel.channel_point, chan_id: channel.chan_id, force: !channel.active })
    }

    // when a user clicks a channel
    const channelClicked = (channel) => {
      // selectedChannel === channel ? setSelectedChannel(null) : setSelectedChannel(channel)
      if (selectedChannel === channel) {
        setSelectedChannel(null)
      } else {
        setSelectedChannel(channel)
      }
    }

    const displayNodeName = (channel) => {
      const node = find(nodes, n => channel.remote_pubkey === n.pub_key)

      if (node && node.alias.length) { return node.alias }

      return channel.remote_pubkey ? channel.remote_pubkey.substring(0, 10) : channel.remote_node_pub.substring(0, 10)
    }

    const channelStatus = (channel) => {
      // if the channel has a confirmation_height property that means it's pending
      if (Object.prototype.hasOwnProperty.call(channel, 'confirmation_height')) { return 'pending' }

      // if the channel has a closing tx that means it's closing
      if (Object.prototype.hasOwnProperty.call(channel, 'closing_txid')) { return 'closing' }

      // if we are in the process of closing this channel
      if (closingChannelIds.includes(channel.chan_id)) { return 'closing' }

      // if the channel isn't active that means the remote peer isn't online
      if (!channel.active) { return 'offline' }


      // if all of the above conditionals fail we can assume the node is online :)
      return 'online'
    }

    const usdAmount = btc.satoshisToUsd(balance.channelBalance, currentTicker.price_usd)

    return (
      <div className={styles.network}>
        <header className={styles.header}>
          <section>
            <h2>My Network</h2>
            <span className={styles.channelAmount}>
              {btc.satoshisToBtc(balance.channelBalance)}BTC ≈ ${usdAmount ? usdAmount.toLocaleString() : ''}
            </span>
          </section>
          <section className={`${styles.addChannel} hint--bottom-left`} onClick={openContactsForm} data-hint='Open a channel'>
            <span className={styles.plusContainer}>
              <Isvg src={plus} />
            </span>
          </section>
        </header>

        <div className={styles.channels}>
          {
            !loadingChannelPubkeys.length && !currentChannels.length &&
            <SuggestedNodes {...suggestedNodesProps} />
          }

          {
            (loadingChannelPubkeys.length > 0 || currentChannels.length) > 0 &&
            <header className={styles.listHeader}>
              <section>
                <h2 onClick={toggleFilterPulldown} className={styles.filterTitle}>
                  {filter.name} <span className={filterPulldown && styles.pulldown}><FaAngleDown /></span>
                </h2>
                <ul className={`${styles.filters} ${filterPulldown && styles.active}`}>
                  {
                    nonActiveFilters.map(f => (
                      <li key={f.key} onClick={() => changeFilter(f)}>
                        {f.name}
                      </li>
                    ))
                  }
                </ul>
              </section>
              <section className={styles.refreshContainer}>
                <span className={styles.refresh} onClick={refreshClicked} ref={(ref) => { this.repeat = ref }}>
                  {
                    this.state.refreshing ?
                      <FaRepeat />
                      :
                      'Refresh'
                  }
                </span>
              </section>
            </header>
          }

          <ul className={filterPulldown && styles.fade}>
            {
              loadingChannelPubkeys.length > 0 && loadingChannelPubkeys.map((loadingPubkey) => {
                // TODO(jimmymow): refactor this out. same logic is in displayNodeName above
                const node = find(nodes, n => loadingPubkey === n.pub_key)
                const nodeDisplay = () => {
                  if (node && node.alias.length) { return node.alias }

                  return loadingPubkey.substring(0, 10)
                }

                return (
                  <li key={loadingPubkey} className={styles.channel}>
                    <section className={styles.channelTitle}>
                      <span className={`${styles.loading} hint--left`} data-hint='loading'>
                        <i className={styles.spinner} />
                      </span>
                      <span>{nodeDisplay()}</span>
                    </section>
                  </li>
                )
              })
            }
            {
              currentChannels.length > 0 && currentChannels.map((channelObj, index) => {
                const channel = Object.prototype.hasOwnProperty.call(channelObj, 'channel') ? channelObj.channel : channelObj
                const pubkey = channel.remote_node_pub || channel.remote_pubkey

                return (
                  <li
                    key={index}
                    className={`${styles.channel} ${selectedChannel === channel && styles.selectedChannel}`}
                    onClick={() => channelClicked(channel)}
                  >
                    <section className={styles.channelTitle}>
                      <span className={`${styles[channelStatus(channelObj)]} hint--right`} data-hint={channelStatus(channelObj)}>
                        {
                          closingChannelIds.includes(channel.chan_id) ?
                            <span className={styles.loading}>
                              <i className={`${styles.spinner} ${styles.closing}`} />
                            </span>
                            :
                            <FaCircle />
                        }
                      </span>
                      <span>{displayNodeName(channel)}</span>
                      {
                        selectedChannel === channel && <span><FaAngleDown /></span>
                      }
                    </section>

                    <section className={styles.channelDetails}>
                      <header>
                        <h4>{`${pubkey.substring(0, 30)}...`}</h4>
                      </header>

                      <div className={styles.limits}>
                        <section>
                          <h5>Pay Limit</h5>
                          <p>
                            <Value
                              value={channel.local_balance}
                              currency={ticker.currency}
                              currentTicker={currentTicker}
                            />
                            <i> {ticker.currency.toUpperCase()}</i>
                          </p>
                        </section>
                        <section>
                          <h5>Request Limit</h5>
                          <p>
                            <Value
                              value={channel.remote_balance}
                              currency={ticker.currency}
                              currentTicker={currentTicker}
                            />
                            <i>{ticker.currency.toUpperCase()}</i>
                          </p>
                        </section>
                      </div>
                      <div className={styles.actions}>
                        {
                          closingChannelIds.includes(channel.chan_id) &&
                            <section>
                              <span className={`${styles.loading} hint--left`} data-hint='closing'>
                                <i>Closing</i> <i className={`${styles.spinner} ${styles.closing}`} />
                              </span>
                            </section>
                        }
                        {
                          (Object.prototype.hasOwnProperty.call(channel, 'active') && !closingChannelIds.includes(channel.chan_id)) &&
                          <section onClick={() => removeClicked(channel)}>
                            <div>Disconnect</div>
                          </section>
                        }
                      </div>
                    </section>
                  </li>
                )
              })
            }
          </ul>
        </div>
        {
          (loadingChannelPubkeys.length > 0 || currentChannels.length) > 0 &&
          <footer className={styles.search}>
            <label htmlFor='search' className={`${styles.label} ${styles.input}`}>
              <Isvg src={search} />
            </label>
            <input
              id='search'
              type='text'
              className={`${styles.text} ${styles.input}`}
              placeholder='search by alias or pubkey'
              value={searchQuery}
              onChange={event => updateChannelSearchQuery(event.target.value)}
            />
          </footer>
        }
      </div>
    )
  }
}

Network.propTypes = {
  currentChannels: PropTypes.array.isRequired,
  nodes: PropTypes.array.isRequired,
  nonActiveFilters: PropTypes.array.isRequired,

  channels: PropTypes.object.isRequired,
  balance: PropTypes.object.isRequired,
  currentTicker: PropTypes.object.isRequired,
  ticker: PropTypes.object.isRequired,
  suggestedNodesProps: PropTypes.object.isRequired,

  fetchChannels: PropTypes.func.isRequired,
  openContactsForm: PropTypes.func.isRequired,
  toggleFilterPulldown: PropTypes.func.isRequired,
  changeFilter: PropTypes.func.isRequired,
  updateChannelSearchQuery: PropTypes.func.isRequired,
  setSelectedChannel: PropTypes.func.isRequired,
  closeChannel: PropTypes.func.isRequired
}

export default Network
