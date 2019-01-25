/**
 * External dependencies
 */
import { map } from 'lodash';
import memize from 'memize';

/**
 * WordPress Dependencies
 */
import { compose } from '@wordpress/compose';
import { Component } from '@wordpress/element';
import { withDispatch, withSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { BlockEditorProvider } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import transformStyles from '../../editor-styles';
class EditorProvider extends Component {
	constructor( props ) {
		super( ...arguments );

		this.getBlockEditorSettings = memize( this.getBlockEditorSettings, {
			maxSize: 1,
		} );

		// Assume that we don't need to initialize in the case of an error recovery.
		if ( props.recovery ) {
			return;
		}

		props.updatePostLock( props.settings.postLock );
		props.setupEditor( props.post, props.initialEdits, props.settings.template );

		if ( props.settings.autosave ) {
			props.createWarningNotice(
				__( 'There is an autosave of this post that is more recent than the version below.' ),
				{
					id: 'autosave-exists',
					actions: [
						{
							label: __( 'View the autosave' ),
							url: props.settings.autosave.editLink,
						},
					],
				}
			);
		}
	}

	getBlockEditorSettings( settings, meta, onMetaChange, reusableBlocks ) {
		return {
			...settings,
			__experimentalMetaSource: {
				value: meta,
				onChange: onMetaChange,
			},
			__experimentalReusableBlocks: reusableBlocks,
		};
	}

	componentDidMount() {
		if ( ! this.props.settings.styles ) {
			return;
		}

		const updatedStyles = transformStyles( this.props.settings.styles, '.editor-styles-wrapper' );

		map( updatedStyles, ( updatedCSS ) => {
			if ( updatedCSS ) {
				const node = document.createElement( 'style' );
				node.innerHTML = updatedCSS;
				document.body.appendChild( node );
			}
		} );
	}

	render() {
		const {
			children,
			blocks,
			updateEditorBlocks,
			isReady,
			settings,
			meta,
			onMetaChange,
			reusableBlocks,
		} = this.props;
		const editorSettings = this.getBlockEditorSettings(
			settings, meta, onMetaChange, reusableBlocks
		);

		if ( ! isReady ) {
			return null;
		}

		return (
			<BlockEditorProvider
				value={ blocks }
				onChange={ updateEditorBlocks }
				settings={ editorSettings }
			>
				{ children }
			</BlockEditorProvider>
		);
	}
}

export default compose( [
	withSelect( ( select ) => {
		const {
			isEditorReady,
			getEditorBlocks,
			getEditedPostAttribute,
			__experimentalGetReusableBlocks,
		} = select( 'core/editor' );
		return {
			isReady: isEditorReady(),
			blocks: getEditorBlocks(),
			meta: getEditedPostAttribute( 'meta' ),
			reusableBlocks: __experimentalGetReusableBlocks(),
		};
	} ),
	withDispatch( ( dispatch ) => {
		const {
			setupEditor,
			updatePostLock,
			updateEditorBlocks,
			editPost,
		} = dispatch( 'core/editor' );
		const { createWarningNotice } = dispatch( 'core/notices' );

		return {
			setupEditor,
			updatePostLock,
			createWarningNotice,
			updateEditorBlocks,
			onMetaChange( meta ) {
				editPost( { meta } );
			},
		};
	} ),
] )( EditorProvider );
